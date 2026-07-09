from datetime import date, time
from decimal import Decimal

import pytest
from django.urls import reverse

from catalog.models import Service
from core.models import BusinessAccount, BusinessProfile, VehicleType
from customers.models import Customer, Vehicle
from quotes.models import Quote
from scheduling.models import Reservation
from workorders.models import WorkOrder


@pytest.fixture
def group_setup(default_business):
    sectors = default_business.sectors
    lavadero = sectors.get(key="lavadero")
    lavadero.default_capacity = 8
    lavadero.save(update_fields=["default_capacity", "updated_at"])
    customer = Customer.objects.create(
        business=default_business,
        name="Flota Norte",
        phone="1122334455",
    )
    service = Service.objects.create(
        business=default_business,
        name="Lavado premium",
        sector=lavadero,
        base_price=Decimal("15000.00"),
        price_moto=Decimal("8000.00"),
        price_auto=Decimal("15000.00"),
        price_camioneta=Decimal("20000.00"),
        estimated_duration_minutes=60,
    )
    vehicle = Vehicle.objects.create(
        business=default_business,
        customer=customer,
        license_plate="AA111AA",
        brand="Honda",
        model="Wave",
        vehicle_type=VehicleType.MOTO,
    )
    return customer, vehicle, service


def vehicle_line(vehicle=None, *, service, day=None, start_time=None, new_vehicle=None):
    payload = {
        "items": [{"service": service.id, "quantity": "1.00"}],
    }
    if vehicle is not None:
        payload["vehicle"] = vehicle.id
    if new_vehicle is not None:
        payload["new_vehicle"] = new_vehicle
    if day is not None:
        payload["reservation_day"] = day
    if start_time is not None:
        payload["reservation_start_time"] = start_time
    return payload


@pytest.mark.django_db
def test_group_quote_accepts_existing_and_inline_new_vehicle(api_client, group_setup):
    customer, vehicle, service = group_setup

    response = api_client.post(
        reverse("quote-list"),
        {
            "is_group": True,
            "customer": customer.id,
            "observations": "Tres autos de la misma flota.",
            "vehicle_lines": [
                vehicle_line(vehicle, service=service),
                vehicle_line(
                    service=service,
                    new_vehicle={
                        "license_plate": "BB222BB",
                        "brand": "Toyota",
                        "model": "Hilux",
                        "vehicle_type": VehicleType.CAMIONETA,
                    },
                ),
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["is_group"] is True
    assert response.data["has_reservation"] is False
    assert response.data["vehicle"] is None
    assert len(response.data["vehicle_lines"]) == 2
    assert Decimal(response.data["vehicle_lines"][0]["items"][0]["unit_price"]) == Decimal("8000.00")
    assert Decimal(response.data["vehicle_lines"][1]["items"][0]["unit_price"]) == Decimal("20000.00")
    assert Decimal(response.data["total"]) == Decimal("28000.00")
    assert Vehicle.objects.filter(customer=customer, license_plate="BB222BB").exists()


@pytest.mark.django_db
def test_group_quote_rejects_more_than_25_vehicle_lines(api_client, group_setup):
    customer, vehicle, service = group_setup

    response = api_client.post(
        reverse("quote-list"),
        {
            "is_group": True,
            "customer": customer.id,
            "vehicle_lines": [
                vehicle_line(vehicle, service=service)
                for _ in range(26)
            ],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "vehicle_lines" in response.data


@pytest.mark.django_db
def test_group_quote_requires_identifiable_new_vehicle(api_client, group_setup):
    customer, _vehicle, service = group_setup

    response = api_client.post(
        reverse("quote-list"),
        {
            "is_group": True,
            "customer": customer.id,
            "vehicle_lines": [
                vehicle_line(
                    service=service,
                    new_vehicle={"vehicle_type": VehicleType.AUTO},
                )
            ],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "vehicle_lines" in response.data


@pytest.mark.django_db
def test_group_quote_rejects_mixed_dated_and_free_lines(api_client, group_setup):
    customer, vehicle, service = group_setup

    response = api_client.post(
        reverse("quote-list"),
        {
            "is_group": True,
            "customer": customer.id,
            "vehicle_lines": [
                vehicle_line(vehicle, service=service, day="2026-08-10"),
                vehicle_line(
                    service=service,
                    new_vehicle={
                        "license_plate": "FF666FF",
                        "brand": "Ford",
                        "model": "Focus",
                        "vehicle_type": VehicleType.AUTO,
                    },
                ),
            ],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "vehicle_lines" in response.data
    assert not Vehicle.objects.filter(license_plate="FF666FF").exists()


@pytest.mark.django_db
def test_group_quote_can_create_reservations_atomically(api_client, group_setup):
    customer, vehicle, service = group_setup

    response = api_client.post(
        reverse("quote-list"),
        {
            "is_group": True,
            "create_reservations": True,
            "customer": customer.id,
            "vehicle_lines": [
                vehicle_line(vehicle, service=service, day="2026-08-10", start_time="09:00"),
                vehicle_line(
                    service=service,
                    day="2026-08-10",
                    start_time="10:30",
                    new_vehicle={
                        "license_plate": "CC333CC",
                        "brand": "Ford",
                        "model": "Ranger",
                        "vehicle_type": VehicleType.CAMIONETA,
                    },
                ),
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["has_reservation"] is True
    quote = Quote.objects.get(pk=response.data["id"])
    assert quote.reservation_id is None
    lines = list(quote.vehicle_lines.order_by("order"))
    assert [line.reservation_id is not None for line in lines] == [True, True]
    assert Reservation.objects.filter(id__in=[line.reservation_id for line in lines]).count() == 2
    assert WorkOrder.objects.filter(reservation_id__in=[line.reservation_id for line in lines]).count() == 2


@pytest.mark.django_db
def test_group_quote_reservation_creation_rolls_back_when_any_line_fails(api_client, group_setup):
    customer, vehicle, service = group_setup
    service.sector.default_capacity = 2
    service.sector.save(update_fields=["default_capacity", "updated_at"])
    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 8, 11),
        start_time=time(8, 0),
        status=Reservation.Status.CONFIRMED,
    )
    quote_count = Quote.objects.count()
    reservation_count = Reservation.objects.count()
    vehicle_count = Vehicle.objects.count()

    response = api_client.post(
        reverse("quote-list"),
        {
            "is_group": True,
            "create_reservations": True,
            "customer": customer.id,
            "vehicle_lines": [
                vehicle_line(vehicle, service=service, day="2026-08-11", start_time="09:00"),
                vehicle_line(
                    service=service,
                    day="2026-08-11",
                    start_time="10:00",
                    new_vehicle={
                        "license_plate": "DD444DD",
                        "brand": "Toyota",
                        "model": "Corolla",
                        "vehicle_type": VehicleType.AUTO,
                    },
                ),
            ],
        },
        format="json",
    )

    assert response.status_code == 400
    assert Quote.objects.count() == quote_count
    assert Reservation.objects.count() == reservation_count
    assert Vehicle.objects.count() == vehicle_count
    assert not Vehicle.objects.filter(license_plate="DD444DD").exists()


@pytest.mark.django_db
def test_group_quote_reservations_action_is_idempotent(api_client, group_setup):
    customer, vehicle, service = group_setup
    quote_response = api_client.post(
        reverse("quote-list"),
        {
            "is_group": True,
            "customer": customer.id,
            "vehicle_lines": [
                vehicle_line(vehicle, service=service, day="2026-08-12", start_time="09:00"),
                vehicle_line(
                    service=service,
                    day="2026-08-12",
                    start_time="10:30",
                    new_vehicle={
                        "license_plate": "EE555EE",
                        "brand": "Fiat",
                        "model": "Cronos",
                        "vehicle_type": VehicleType.AUTO,
                    },
                ),
            ],
        },
        format="json",
    )
    quote_id = quote_response.data["id"]

    first = api_client.post(reverse("quote-reservations", args=[quote_id]), format="json")
    second = api_client.post(reverse("quote-reservations", args=[quote_id]), format="json")

    assert first.status_code == 201, first.data
    assert second.status_code == 200, second.data
    assert first.data["id"] == second.data["id"] == quote_id
    assert Quote.objects.get(pk=quote_id).vehicle_lines.filter(reservation__isnull=False).count() == 2
    assert Reservation.objects.filter(quote_vehicle_line__quote_id=quote_id).count() == 2


@pytest.mark.django_db
def test_reservation_quote_action_returns_group_document(api_client, group_setup):
    customer, vehicle, service = group_setup
    quote_response = api_client.post(
        reverse("quote-list"),
        {
            "is_group": True,
            "create_reservations": True,
            "customer": customer.id,
            "vehicle_lines": [
                vehicle_line(vehicle, service=service, day="2026-08-13", start_time="09:00"),
            ],
        },
        format="json",
    )
    quote = Quote.objects.get(pk=quote_response.data["id"])
    reservation_id = quote.vehicle_lines.get().reservation_id

    response = api_client.post(reverse("reservation-quote", args=[reservation_id]), format="json")

    assert response.status_code == 200
    assert response.data["id"] == quote.id
    assert response.data["is_group"] is True


@pytest.mark.django_db
def test_group_quote_rejects_cross_business_vehicle(api_client, group_setup):
    customer, _vehicle, service = group_setup
    other_business = BusinessAccount.objects.create(name="Otro negocio", slug="otro-negocio")
    BusinessProfile.objects.create(business=other_business, name="Otro negocio")
    other_customer = Customer.objects.create(business=other_business, name="Cliente externo")
    other_vehicle = Vehicle.objects.create(
        business=other_business,
        customer=other_customer,
        license_plate="ZZ999ZZ",
    )

    response = api_client.post(
        reverse("quote-list"),
        {
            "is_group": True,
            "customer": customer.id,
            "vehicle_lines": [vehicle_line(other_vehicle, service=service)],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "vehicle_lines" in response.data
