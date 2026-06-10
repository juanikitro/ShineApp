from datetime import date, time
from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework.test import APIClient

from catalog.models import Service
from core.models import BusinessProfile
from customers.models import Customer, Vehicle
from scheduling.models import Reservation


@pytest.fixture
def api_client(db, django_user_model):
    user = django_user_model.objects.create_user(username="admin", password="admin123")
    employer_group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(employer_group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


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
    from catalog.sector_defaults import ensure_default_sectors
    from core.models import BusinessAccount
    lavadero = ensure_default_sectors(BusinessAccount.get_default())["lavadero"]
    service = Service.objects.create(
        name="Lavado premium",
        sector=lavadero,
        base_price=Decimal("15000.00"),
        estimated_duration_minutes=90,
    )
    return customer, vehicle, service


@pytest.mark.django_db
def test_reservation_accepts_optional_exit_day_and_exposes_it(api_client, base_data):
    customer, vehicle, service = base_data

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "exit_day": "2026-04-30",
            "start_time": "10:00:00",
            "exit_time": "18:30:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["day"] == "2026-04-28"
    assert response.data["exit_day"] == "2026-04-30"
    assert response.data["exit_time"] == "18:30:00"
    reservation = Reservation.objects.get(pk=response.data["id"])
    assert reservation.exit_day == date(2026, 4, 30)
    assert reservation.exit_time == time(18, 30)


@pytest.mark.django_db
def test_reservation_rejects_exit_day_before_entry_day(api_client, base_data):
    customer, vehicle, service = base_data

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "exit_day": "2026-04-27",
            "start_time": "10:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "egreso" in str(response.data).lower()


@pytest.mark.django_db
def test_reservation_rejects_exit_time_before_entry_time_on_same_day(api_client, base_data):
    customer, vehicle, service = base_data

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "start_time": "10:00:00",
            "exit_time": "09:59:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "hora de egreso" in str(response.data).lower()


@pytest.mark.django_db
def test_daily_agenda_includes_reservations_across_entry_stay_and_exit_days(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        exit_day=date(2026, 4, 30),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )

    entry_response = api_client.get(reverse("agenda-daily"), {"date": "2026-04-28"})
    stay_response = api_client.get(reverse("agenda-daily"), {"date": "2026-04-29"})
    exit_response = api_client.get(reverse("agenda-daily"), {"date": "2026-04-30"})
    after_response = api_client.get(reverse("agenda-daily"), {"date": "2026-05-01"})

    assert entry_response.status_code == 200
    assert stay_response.status_code == 200
    assert exit_response.status_code == 200
    assert after_response.status_code == 200
    assert [item["id"] for item in entry_response.data["reservations"]] == [reservation.id]
    assert [item["id"] for item in stay_response.data["reservations"]] == [reservation.id]
    assert [item["id"] for item in exit_response.data["reservations"]] == [reservation.id]
    assert after_response.data["reservations"] == []


@pytest.mark.django_db
def test_daily_agenda_hides_stay_days_when_business_profile_disables_it(api_client, base_data):
    customer, vehicle, service = base_data
    profile = BusinessProfile.get_solo()
    profile.show_stay_days_in_agenda = False
    profile.save(update_fields=["show_stay_days_in_agenda", "updated_at"])
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        exit_day=date(2026, 4, 30),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )

    entry_response = api_client.get(reverse("agenda-daily"), {"date": "2026-04-28"})
    stay_response = api_client.get(reverse("agenda-daily"), {"date": "2026-04-29"})
    exit_response = api_client.get(reverse("agenda-daily"), {"date": "2026-04-30"})

    assert entry_response.status_code == 200
    assert stay_response.status_code == 200
    assert exit_response.status_code == 200
    assert [item["id"] for item in entry_response.data["reservations"]] == [reservation.id]
    assert stay_response.data["reservations"] == []
    assert exit_response.data["reservations"] == []


@pytest.mark.django_db
def test_patch_day_preserves_entry_exit_relation_when_exit_day_is_omitted(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        exit_day=date(2026, 4, 30),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.patch(
        reverse("reservation-detail", args=[reservation.id]),
        {"day": "2026-04-29"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["day"] == "2026-04-29"
    assert response.data["exit_day"] == "2026-05-01"
    reservation.refresh_from_db()
    assert reservation.day == date(2026, 4, 29)
    assert reservation.exit_day == date(2026, 5, 1)


@pytest.mark.django_db
def test_patch_exit_day_accepts_legacy_service_when_items_payload_is_empty(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        exit_day=date(2026, 4, 30),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.patch(
        reverse("reservation-detail", args=[reservation.id]),
        {
            "service": service.id,
            "items": [],
            "exit_day": "2026-05-01",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.data["exit_day"] == "2026-05-01"
    assert response.data["items"][0]["service"] == service.id
    reservation.refresh_from_db()
    assert reservation.exit_day == date(2026, 5, 1)


@pytest.mark.django_db
def test_patch_exit_time_is_persisted(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.patch(
        reverse("reservation-detail", args=[reservation.id]),
        {"exit_time": "13:15:00"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["exit_time"] == "13:15:00"
    reservation.refresh_from_db()
    assert reservation.exit_time == time(13, 15)
