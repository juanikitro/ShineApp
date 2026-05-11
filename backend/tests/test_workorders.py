from decimal import Decimal

import pytest
from django.db import IntegrityError
from django.urls import reverse

from catalog.models import Service
from customers.models import Customer, Vehicle
from scheduling.models import Reservation
from workorders.models import WorkOrder


@pytest.fixture
def base_data(db):
    customer = Customer.objects.create(name="Juan Perez", phone="1122334455", email="juan@example.com")
    vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="ab123cd",
        brand="Ford",
        model="Focus",
        color="Gris",
    )
    service = Service.objects.create(
        name="Lavado premium",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("15000.00"),
        estimated_duration_minutes=90,
    )
    return customer, vehicle, service


@pytest.mark.django_db
def test_work_order_api_rejects_manual_creation_without_reservation(api_client, base_data):
    customer, vehicle, service = base_data

    response = api_client.post(
        reverse("workorder-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "status": WorkOrder.Status.PENDING,
            "total_amount": "15000.00",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "reservation" in response.data
    assert WorkOrder.objects.count() == 0


@pytest.mark.django_db
def test_work_order_model_requires_reservation(base_data):
    customer, vehicle, service = base_data

    with pytest.raises(IntegrityError):
        WorkOrder.objects.create(
            customer=customer,
            vehicle=vehicle,
            service=service,
            total_amount=Decimal("15000.00"),
        )


@pytest.mark.django_db
def test_reservation_always_creates_work_order(api_client, base_data):
    customer, vehicle, service = base_data

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "start_time": "10:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )

    assert response.status_code == 201
    reservation = Reservation.objects.get(pk=response.data["id"])
    order = WorkOrder.objects.get(reservation=reservation)
    assert response.data["work_order"]["id"] == order.id
    assert response.data["work_order"]["status"] == Reservation.Status.PENDING


@pytest.mark.django_db
def test_work_order_status_updates_reservation_status(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day="2026-04-28",
        status=Reservation.Status.CONFIRMED,
    )
    order = reservation.work_order

    response = api_client.post(
        reverse("workorder-status", args=[order.id]),
        {"status": "ready"},
        format="json",
    )

    assert response.status_code == 200
    reservation.refresh_from_db()
    order.refresh_from_db()
    assert reservation.status == "ready"
    assert order.status == "ready"
    assert response.data["status"] == "ready"


@pytest.mark.django_db
def test_work_order_delete_is_blocked_to_keep_reservation_pair(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day="2026-04-28",
        status=Reservation.Status.CONFIRMED,
    )
    order = reservation.work_order

    response = api_client.delete(reverse("workorder-detail", args=[order.id]))

    assert response.status_code == 405
    assert Reservation.objects.filter(pk=reservation.id).exists()
    assert WorkOrder.objects.filter(pk=order.id, reservation=reservation).exists()
