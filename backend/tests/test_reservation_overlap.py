from datetime import date, time
from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework.test import APIClient

from catalog.models import Service
from core.models import BusinessAccount, BusinessProfile, UserProfile
from customers.models import Customer, Vehicle
from scheduling.models import DailyCapacity, Reservation


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
    service = Service.objects.create(
        name="Lavado premium",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("15000.00"),
        estimated_duration_minutes=60,
    )
    return customer, vehicle, service


@pytest.mark.django_db
def test_overlap_is_blocked_when_setting_off(api_client, base_data):
    customer, vehicle, service = base_data
    profile = BusinessProfile.get_solo()
    profile.allow_overlapping_reservations = False
    profile.save(update_fields=["allow_overlapping_reservations"])

    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 7, 10),
        start_time=time(16, 0),
        estimated_duration_minutes=60,
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-07-10",
            "start_time": "16:30:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )
    assert response.status_code == 400, response.data
    assert "solapa" in str(response.data).lower()


@pytest.mark.django_db
def test_overlap_is_allowed_when_setting_on(api_client, base_data):
    customer, vehicle, service = base_data
    profile = BusinessProfile.get_solo()
    profile.allow_overlapping_reservations = True
    profile.save(update_fields=["allow_overlapping_reservations"])

    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 7, 10),
        start_time=time(16, 0),
        estimated_duration_minutes=60,
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-07-10",
            "start_time": "16:30:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )
    assert response.status_code == 201, response.data


@pytest.mark.django_db
def test_non_overlapping_reservation_is_allowed(api_client, base_data):
    customer, vehicle, service = base_data
    profile = BusinessProfile.get_solo()
    profile.allow_overlapping_reservations = False
    profile.save(update_fields=["allow_overlapping_reservations"])

    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 7, 10),
        start_time=time(16, 0),
        estimated_duration_minutes=60,
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-07-10",
            "start_time": "17:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )
    assert response.status_code == 201, response.data


def _create_public_business(slug="overlap-test"):
    business = BusinessAccount.objects.create(name="Lavadero Test", slug=slug)
    BusinessProfile.objects.create(
        business=business,
        name="Lavadero Test",
        public_landing_enabled=True,
        allow_public_booking_requests=True,
        allow_public_quote_requests=True,
        allow_overlapping_reservations=False,
        opening_time=time(9, 0),
        closing_time=time(20, 0),
    )
    return business


@pytest.mark.django_db
def test_public_availability_endpoint_returns_capacity_and_occupied():
    business = _create_public_business()
    service = Service.objects.create(
        business=business,
        name="Lavado",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("10000"),
        estimated_duration_minutes=60,
    )
    customer = Customer.objects.create(business=business, name="Cliente", phone="1234")
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
        color="Negro",
    )
    DailyCapacity.objects.create(
        business=business,
        day=date(2026, 8, 12),
        max_slots_wash=2,
        max_slots_detailing=1,
    )
    Reservation.objects.create(
        business=business,
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 8, 12),
        start_time=time(10, 0),
        estimated_duration_minutes=60,
        status=Reservation.Status.CONFIRMED,
    )

    client = APIClient()
    url = reverse("public-landing-availability", args=[business.slug])
    response = client.get(url, {"date": "2026-08-12"})
    assert response.status_code == 200, response.data
    body = response.data
    assert body["date"] == "2026-08-12"
    assert body["allow_overlapping"] is False
    assert body["wash"]["max_slots"] == 2
    assert body["wash"]["used_slots"] == 1
    assert body["wash"]["available_slots"] == 1
    assert body["detailing"]["max_slots"] == 1
    assert body["detailing"]["used_slots"] == 0
    assert body["occupied"] == [{"start_time": "10:00", "duration_minutes": 60}]


@pytest.mark.django_db
def test_public_request_rejected_when_capacity_full():
    business = _create_public_business(slug="overlap-test-full")
    service = Service.objects.create(
        business=business,
        name="Lavado",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("10000"),
        estimated_duration_minutes=60,
    )
    customer = Customer.objects.create(business=business, name="Cliente", phone="1234")
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
        color="Negro",
    )
    DailyCapacity.objects.create(
        business=business,
        day=date(2026, 8, 12),
        max_slots_wash=1,
        max_slots_detailing=1,
    )
    Reservation.objects.create(
        business=business,
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 8, 12),
        start_time=time(10, 0),
        estimated_duration_minutes=60,
        status=Reservation.Status.CONFIRMED,
    )

    client = APIClient()
    response = client.post(
        reverse("public-landing-requests", args=[business.slug]),
        {
            "customer_name": "Otro cliente",
            "customer_phone": "1199",
            "customer_email": "otro@example.com",
            "vehicle_license_plate": "xy987zw",
            "vehicle_brand": "Fiat",
            "vehicle_model": "Cronos",
            "vehicle_type": "auto",
            "preferred_day": "2026-08-12",
            "preferred_time": "11:00:00",
            "message": "",
            "website": "",
            "service_ids": [service.id],
        },
        format="json",
    )
    assert response.status_code == 400, response.data
    assert "capacidad" in str(response.data).lower()


@pytest.mark.django_db
def test_public_request_rejects_overlapping_time():
    business = _create_public_business(slug="overlap-test-time")
    service = Service.objects.create(
        business=business,
        name="Lavado",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("10000"),
        estimated_duration_minutes=60,
    )
    customer = Customer.objects.create(business=business, name="Cliente", phone="1234")
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
        color="Negro",
    )
    DailyCapacity.objects.create(
        business=business,
        day=date(2026, 8, 12),
        max_slots_wash=5,
        max_slots_detailing=5,
    )
    Reservation.objects.create(
        business=business,
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 8, 12),
        start_time=time(10, 0),
        estimated_duration_minutes=60,
        status=Reservation.Status.CONFIRMED,
    )

    client = APIClient()
    response = client.post(
        reverse("public-landing-requests", args=[business.slug]),
        {
            "customer_name": "Otro cliente",
            "customer_phone": "1199",
            "customer_email": "otro@example.com",
            "vehicle_license_plate": "xy987zw",
            "vehicle_brand": "Fiat",
            "vehicle_model": "Cronos",
            "vehicle_type": "auto",
            "preferred_day": "2026-08-12",
            "preferred_time": "10:30:00",
            "message": "",
            "website": "",
            "service_ids": [service.id],
        },
        format="json",
    )
    assert response.status_code == 400, response.data
    assert "solapa" in str(response.data).lower()


@pytest.mark.django_db
def test_public_request_allows_overlap_when_setting_on():
    business = _create_public_business(slug="overlap-test-on")
    profile = BusinessProfile.objects.get(business=business)
    profile.allow_overlapping_reservations = True
    profile.save(update_fields=["allow_overlapping_reservations"])
    service = Service.objects.create(
        business=business,
        name="Lavado",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("10000"),
        estimated_duration_minutes=60,
    )
    customer = Customer.objects.create(business=business, name="Cliente", phone="1234")
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
        color="Negro",
    )
    DailyCapacity.objects.create(
        business=business,
        day=date(2026, 8, 12),
        max_slots_wash=5,
        max_slots_detailing=5,
    )
    Reservation.objects.create(
        business=business,
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 8, 12),
        start_time=time(10, 0),
        estimated_duration_minutes=60,
        status=Reservation.Status.CONFIRMED,
    )

    client = APIClient()
    response = client.post(
        reverse("public-landing-requests", args=[business.slug]),
        {
            "customer_name": "Otro cliente",
            "customer_phone": "1199",
            "customer_email": "otro@example.com",
            "vehicle_license_plate": "xy987zw",
            "vehicle_brand": "Fiat",
            "vehicle_model": "Cronos",
            "vehicle_type": "auto",
            "preferred_day": "2026-08-12",
            "preferred_time": "10:30:00",
            "message": "",
            "website": "",
            "service_ids": [service.id],
        },
        format="json",
    )
    assert response.status_code == 201, response.data
