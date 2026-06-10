from datetime import date, time
from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework.test import APIClient

from catalog.models import Sector, Service
from catalog.sector_defaults import ensure_default_sectors, SERVICE_TYPE_TO_SECTOR_KEY
from core.models import BusinessAccount, BusinessProfile, UserProfile
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


def _create_public_business(slug="overlap-test", capacity_wash=8, capacity_detailing=8):
    business = BusinessAccount.objects.create(name="Lavadero Test", slug=slug)
    BusinessProfile.objects.create(
        business=business,
        name="Lavadero Test",
        public_landing_enabled=True,
        allow_public_booking_requests=True,
        allow_public_quote_requests=True,
        allow_overlapping_reservations=False,
        enforce_capacity_limit=True,
        default_capacity_wash=capacity_wash,
        default_capacity_detailing=capacity_detailing,
        opening_time=time(9, 0),
        closing_time=time(20, 0),
    )
    sectors = ensure_default_sectors(business)
    sectors["lavadero"].default_capacity = capacity_wash
    sectors["lavadero"].save(update_fields=["default_capacity", "updated_at"])
    sectors["detailing"].default_capacity = capacity_detailing
    sectors["detailing"].save(update_fields=["default_capacity", "updated_at"])
    return business


def _service_for_business(business, service_type=Service.ServiceType.WASH, name="Lavado"):
    sector_key = SERVICE_TYPE_TO_SECTOR_KEY.get(service_type, "lavadero")
    sector = Sector.objects.filter(business=business, key=sector_key).first()
    return Service.objects.create(
        business=business,
        name=name,
        service_type=service_type,
        sector=sector,
        base_price=Decimal("10000"),
        estimated_duration_minutes=60,
    )


@pytest.mark.django_db
def test_public_availability_endpoint_returns_capacity_and_occupied():
    business = _create_public_business(capacity_wash=2, capacity_detailing=1)
    service = _service_for_business(business, Service.ServiceType.WASH)
    customer = Customer.objects.create(business=business, name="Cliente", phone="1234")
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
        color="Negro",
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
    assert body["capacity_enforced"] is True
    sectors_by_key = {s["key"]: s for s in body["sectors"]}
    assert sectors_by_key["lavadero"]["max_slots"] == 2
    assert sectors_by_key["lavadero"]["used_slots"] == 1
    assert sectors_by_key["lavadero"]["available_slots"] == 1
    assert sectors_by_key["detailing"]["max_slots"] == 1
    assert sectors_by_key["detailing"]["used_slots"] == 0
    assert body["occupied"] == [{"start_time": "10:00", "duration_minutes": 60}]


@pytest.mark.django_db
def test_public_request_rejected_when_capacity_full():
    business = _create_public_business(
        slug="overlap-test-full", capacity_wash=1, capacity_detailing=1
    )
    service = _service_for_business(business, Service.ServiceType.WASH)
    customer = Customer.objects.create(business=business, name="Cliente", phone="1234")
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
        color="Negro",
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
def test_public_request_allowed_when_capacity_limit_disabled():
    business = _create_public_business(
        slug="overlap-test-no-limit", capacity_wash=1, capacity_detailing=1
    )
    profile = BusinessProfile.objects.get(business=business)
    profile.enforce_capacity_limit = False
    profile.save(update_fields=["enforce_capacity_limit"])
    service = _service_for_business(business, Service.ServiceType.WASH)
    customer = Customer.objects.create(business=business, name="Cliente", phone="1234")
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
        color="Negro",
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
    assert response.status_code == 201, response.data


@pytest.mark.django_db
def test_public_request_rejects_overlapping_time():
    business = _create_public_business(
        slug="overlap-test-time", capacity_wash=5, capacity_detailing=5
    )
    service = _service_for_business(business, Service.ServiceType.WASH)
    customer = Customer.objects.create(business=business, name="Cliente", phone="1234")
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
        color="Negro",
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
    business = _create_public_business(
        slug="overlap-test-on", capacity_wash=5, capacity_detailing=5
    )
    profile = BusinessProfile.objects.get(business=business)
    profile.allow_overlapping_reservations = True
    profile.save(update_fields=["allow_overlapping_reservations"])
    service = _service_for_business(business, Service.ServiceType.WASH)
    customer = Customer.objects.create(business=business, name="Cliente", phone="1234")
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
        color="Negro",
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
