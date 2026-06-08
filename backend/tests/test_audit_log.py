import json
from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse

from catalog.models import Service
from core.models import AuditLog
from customers.models import Customer, Vehicle
from scheduling.models import Reservation


pytestmark = pytest.mark.django_db(transaction=True)


def response_payload(response):
    return response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data


@pytest.fixture
def audit_base_data(db):
    customer = Customer.objects.create(name="Juan Perez", phone="1122334455")
    vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="ab123cd",
        brand="Ford",
        model="Focus",
    )
    service = Service.objects.create(
        name="Lavado premium",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("15000.00"),
        estimated_duration_minutes=90,
    )
    return customer, vehicle, service


def test_mutating_endpoint_records_actor_before_after_and_changes(api_client):
    create_response = api_client.post(
        reverse("customer-list"),
        {
            "name": "Ana Lopez",
            "phone": "1111",
            "email": "ana@example.com",
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.data

    created = Customer.objects.get(name="Ana Lopez")
    create_event = AuditLog.objects.get(action="create")
    assert create_event.actor_username == "admin"
    assert create_event.actor_role == "empleador"
    assert create_event.module == "customers"
    assert create_event.entity_type == "Customer"
    assert create_event.entity_id == str(created.id)
    assert create_event.entity_label == "Ana Lopez"
    assert create_event.before is None
    assert create_event.after["name"] == "Ana Lopez"
    assert create_event.changes["name"] == {"before": None, "after": "Ana Lopez"}
    assert create_event.request_method == "POST"
    assert create_event.request_path.endswith("/api/customers/")

    update_response = api_client.patch(
        reverse("customer-detail", args=[created.id]),
        {"phone": "2222"},
        format="json",
    )
    assert update_response.status_code == 200, update_response.data

    update_event = AuditLog.objects.get(action="update")
    assert update_event.before["phone"] == "1111"
    assert update_event.after["phone"] == "2222"
    assert update_event.changes["phone"] == {"before": "1111", "after": "2222"}


def test_employee_actions_are_attributed_but_audit_api_is_employer_only(api_client, employee_client):
    response = employee_client.post(
        reverse("customer-list"),
        {"name": "Cliente empleado"},
        format="json",
    )
    assert response.status_code == 201, response.data

    event = AuditLog.objects.get()
    assert event.actor_username == "empleado"
    assert event.actor_role == "empleado"

    forbidden = employee_client.get(reverse("audit-log"))
    assert forbidden.status_code == 403

    list_response = api_client.get(reverse("audit-log"), {"actor": "empleado"})
    assert list_response.status_code == 200, list_response.data
    payload = response_payload(list_response)
    assert len(payload) == 1
    assert payload[0]["actor_username"] == "empleado"
    assert payload[0]["is_current_user"] is False


def test_safe_reads_do_not_create_audit_entries(employee_client):
    Customer.objects.create(name="Solo lectura")

    response = employee_client.get(reverse("customer-list"))

    assert response.status_code == 200, response.data
    assert AuditLog.objects.count() == 0


def test_sensitive_employee_password_is_redacted(api_client):
    response = api_client.post(
        reverse("auth-employees"),
        {
            "username": "operario",
            "email": "operario@example.com",
            "password": "operario123",
        },
        format="json",
    )
    assert response.status_code == 201, response.data

    event = AuditLog.objects.get()
    serialized = json.dumps(event.after) + json.dumps(event.changes)
    assert "operario123" not in serialized
    assert event.after["password"] == "[redacted]"
    assert event.changes["password"]["after"] == "[redacted]"


def test_soft_delete_and_custom_actions_are_audited(api_client, audit_base_data):
    from catalog.models import Service

    _customer, _vehicle, service = audit_base_data

    delete_response = api_client.delete(reverse("service-detail", args=[service.id]))
    assert delete_response.status_code == 204, delete_response.data
    refreshed = Service.all_objects.get(pk=service.pk)
    assert refreshed.is_active is False
    assert refreshed.deleted_at is not None

    delete_event = AuditLog.objects.get(action="delete")
    assert delete_event.before["is_active"] is True
    assert delete_event.after["is_active"] is False
    assert delete_event.changes["is_active"] == {"before": True, "after": False}

    customer, vehicle, canceled_service = audit_base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=canceled_service,
        day=date(2026, 5, 12),
        status=Reservation.Status.CONFIRMED,
    )

    cancel_response = api_client.post(reverse("reservation-cancel", args=[reservation.id]))
    assert cancel_response.status_code == 200, cancel_response.data

    cancel_event = AuditLog.objects.get(action="cancel")
    assert cancel_event.entity_type == "Reservation"
    assert cancel_event.before["status"] == Reservation.Status.CONFIRMED
    assert cancel_event.after["status"] == Reservation.Status.CANCELED
    assert cancel_event.changes["status"] == {
        "before": Reservation.Status.CONFIRMED,
        "after": Reservation.Status.CANCELED,
    }
