from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse

from catalog.models import Service
from catalog.sector_defaults import ensure_default_sectors
from core.models import AuditLog, BusinessAccount
from customers.models import Customer, Vehicle
from finance.models import CashMovement, Payment
from inventory.models import Supplier
from scheduling.models import Reservation
from workorders.models import WorkOrder

pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def trash_base(db):
    business = BusinessAccount.get_default()
    sectors = ensure_default_sectors(business)
    lavadero = sectors["lavadero"]
    customer = Customer.objects.create(name="Juan Trash", phone="1100")
    vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="trash01",
        brand="Ford",
        model="Focus",
    )
    service = Service.objects.create(
        name="Lavado integral",
        sector=lavadero,
        base_price=Decimal("12000.00"),
        estimated_duration_minutes=60,
    )
    return business, customer, vehicle, service


def _delete_customer(customer):
    """Borra el cliente directamente (simula borrado desde la app)."""
    customer.delete()


def test_trash_list_groups_deleted_records_by_type(api_client, trash_base):
    _, customer, vehicle, service = trash_base
    customer.delete()
    vehicle.delete()
    service.delete()

    response = api_client.get(reverse("trash-list"))
    assert response.status_code == 200, response.data
    data = response.data
    assert data["total"] >= 3
    by_type = {group["type"]: group for group in data["groups"]}
    assert by_type["customer"]["count"] == 1
    assert by_type["customer"]["items"][0]["label"] == "Juan Trash"
    assert by_type["customer"]["items"][0]["deleted_at"]
    assert by_type["vehicle"]["count"] == 1
    assert by_type["service"]["count"] == 1


def test_trash_list_supports_type_filter(api_client, trash_base):
    _, customer, vehicle, _service = trash_base
    customer.delete()
    vehicle.delete()

    response = api_client.get(reverse("trash-list"), {"type": "customer"})
    assert response.status_code == 200, response.data
    types = {group["type"] for group in response.data["groups"]}
    assert types == {"customer"}
    assert response.data["groups"][0]["count"] == 1


def test_trash_list_requires_employer_role(employee_client, trash_base):
    response = employee_client.get(reverse("trash-list"))
    assert response.status_code == 403


def test_trash_restore_marks_record_alive_again(api_client, trash_base):
    _, customer, _vehicle, _service = trash_base
    customer.delete()
    assert Customer.all_objects.get(pk=customer.pk).deleted_at is not None

    response = api_client.post(
        reverse("trash-restore", args=["customer", customer.pk]),
    )
    assert response.status_code == 200, response.data
    customer.refresh_from_db()
    assert customer.deleted_at is None
    assert customer.is_active is True

    audit = AuditLog.objects.filter(action="restore").last()
    assert audit is not None
    assert audit.entity_type == "Customer"
    assert audit.entity_id == str(customer.pk)


def test_trash_restore_unknown_type_returns_404(api_client):
    response = api_client.post(reverse("trash-restore", args=["aliens", 1]))
    assert response.status_code == 404


def test_trash_restore_missing_record_returns_404(api_client):
    response = api_client.post(
        reverse("trash-restore", args=["customer", 9999]),
    )
    assert response.status_code == 404


def test_trash_purge_runs_hard_delete(api_client, trash_base):
    business, *_ = trash_base
    supplier = Supplier.objects.create(business=business, name="Proveedor demo")
    supplier.delete()
    response = api_client.delete(
        reverse("trash-purge", args=["supplier", supplier.pk]),
    )
    assert response.status_code == 204, response.data
    assert not Supplier.all_objects.filter(pk=supplier.pk).exists()

    audit = AuditLog.objects.filter(action="purge").last()
    assert audit is not None
    assert audit.entity_type == "Supplier"
    assert audit.entity_id == str(supplier.pk)


def test_trash_purge_with_protected_dependencies_returns_409(api_client, trash_base):
    _, customer, vehicle, _service = trash_base
    # El cliente tiene vehiculos PROTECT: aunque ambos esten en la papelera, el
    # hard delete del cliente debe fallar con un mensaje claro hasta que se
    # purguen primero los vehiculos.
    customer.delete()
    vehicle.delete()
    response = api_client.delete(
        reverse("trash-purge", args=["customer", customer.pk]),
    )
    assert response.status_code == 409, response.data
    assert "registros relacionados" in response.data["detail"]
    assert Customer.all_objects.filter(pk=customer.pk).exists()


def test_trash_restore_reservation_recovers_work_order_and_payment(
    api_client, trash_base
):
    business, customer, vehicle, service = trash_base
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 6, 12),
        status=Reservation.Status.CONFIRMED,
    )
    work_order = reservation.work_order
    payment = Payment.objects.create(work_order=work_order, amount=Decimal("1000"))

    reservation.delete()
    assert Reservation.all_objects.get(pk=reservation.pk).deleted_at is not None
    assert WorkOrder.all_objects.get(pk=work_order.pk).deleted_at is not None
    assert Payment.all_objects.get(pk=payment.pk).deleted_at is not None

    response = api_client.post(
        reverse("trash-restore", args=["reservation", reservation.pk]),
    )
    assert response.status_code == 200, response.data

    reservation.refresh_from_db()
    work_order.refresh_from_db()
    payment.refresh_from_db()
    assert reservation.deleted_at is None
    assert work_order.deleted_at is None
    assert payment.deleted_at is None


def test_trash_restore_payment_recovers_cash_movement(api_client, trash_base):
    _, customer, vehicle, service = trash_base
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 6, 13),
        status=Reservation.Status.CONFIRMED,
    )
    work_order = reservation.work_order
    payment = Payment.objects.create(work_order=work_order, amount=Decimal("1500"))
    cash_movement = CashMovement.objects.create(
        movement_type=CashMovement.MovementType.INCOME,
        category="Pago",
        amount=Decimal("1500"),
        payment=payment,
    )

    payment.delete()
    assert Payment.all_objects.get(pk=payment.pk).deleted_at is not None
    assert CashMovement.all_objects.get(pk=cash_movement.pk).deleted_at is not None

    response = api_client.post(
        reverse("trash-restore", args=["payment", payment.pk]),
    )
    assert response.status_code == 200, response.data

    payment.refresh_from_db()
    cash_movement.refresh_from_db()
    assert payment.deleted_at is None
    assert cash_movement.deleted_at is None
