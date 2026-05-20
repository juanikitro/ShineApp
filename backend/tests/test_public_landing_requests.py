from datetime import date, time
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient

from catalog.models import Service
from core.models import BusinessAccount, BusinessProfile, UserProfile
from customers.models import Customer, Vehicle
from notifications.models import PublicRequest
from quotes.models import Quote
from scheduling.models import Reservation


def create_business(name="King Shine", slug="king-shine"):
    business = BusinessAccount.objects.create(name=name, slug=slug)
    BusinessProfile.objects.create(
        business=business,
        name=name,
        contact_phone="11 5555-2222",
        contact_email="hola@kingshine.test",
        address="Parana 158",
        public_landing_intro="Detailing profesional por turno.",
    )
    return business


def create_employer_client(business, username="dueno"):
    user = get_user_model().objects.create_user(username=username, password="dueno123")
    group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(group)
    UserProfile.objects.create(user=user, business=business)
    client = APIClient()
    client.force_authenticate(user=user)
    client.user = user
    return client


def create_service(business, name="Lavado premium", service_type=Service.ServiceType.WASH):
    return Service.objects.create(
        business=business,
        name=name,
        service_type=service_type,
        base_price=Decimal("15000.00"),
        estimated_duration_minutes=90,
        notes="Incluye interior y llantas.",
    )


def public_request_payload(service):
    return {
        "request_type": PublicRequest.RequestType.BOOKING,
        "customer_name": "Juan Perez",
        "customer_phone": "11 2345-6789",
        "customer_email": "juan@example.com",
        "vehicle_license_plate": "ab123cd",
        "vehicle_brand": "Fiat",
        "vehicle_model": "Cronos",
        "vehicle_color": "Negro",
        "preferred_day": "2026-05-22",
        "preferred_time": "10:30:00",
        "message": "Prefiere turno por la manana.",
        "service_ids": [service.id],
        "website": "",
    }


@pytest.mark.django_db
def test_public_landing_is_available_without_auth_and_hides_prices():
    business = create_business()
    service = create_service(business)
    inactive = create_service(business, name="Servicio interno")
    inactive.is_active = False
    inactive.save(update_fields=["is_active", "updated_at"])
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    assert response.data["business"]["name"] == "King Shine"
    assert response.data["business"]["slug"] == "king-shine"
    assert response.data["business"]["intro"] == "Detailing profesional por turno."
    assert response.data["actions"] == {"booking_requests": True, "quote_requests": True}
    assert len(response.data["services"]) == 1
    assert response.data["services"][0]["id"] == service.id
    assert response.data["services"][0]["name"] == service.name
    assert "base_price" not in response.data["services"][0]


@pytest.mark.django_db
def test_public_landing_returns_not_found_when_business_is_inactive_or_disabled():
    business = create_business()
    client = APIClient()

    business.is_active = False
    business.save(update_fields=["is_active", "updated_at"])
    inactive_response = client.get(reverse("public-landing", args=[business.slug]))

    business.is_active = True
    business.save(update_fields=["is_active", "updated_at"])
    business.profile.public_landing_enabled = False
    business.profile.save(update_fields=["public_landing_enabled", "updated_at"])
    disabled_response = client.get(reverse("public-landing", args=[business.slug]))

    assert inactive_response.status_code == 404
    assert disabled_response.status_code == 404


@pytest.mark.django_db
def test_public_request_create_validates_services_honeypot_and_rate_limit():
    business = create_business()
    service = create_service(business)
    other_business = create_business("Other Shine", "other-shine")
    other_service = create_service(other_business, name="Lavado externo")
    client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    wrong_service = client.post(
        url,
        {**public_request_payload(service), "service_ids": [other_service.id]},
        format="json",
    )
    honeypot = client.post(
        url,
        {**public_request_payload(service), "website": "https://spam.test"},
        format="json",
    )
    created = client.post(
        url,
        public_request_payload(service),
        format="json",
        REMOTE_ADDR="203.0.113.10",
    )

    assert wrong_service.status_code == 400
    assert "service_ids" in wrong_service.data
    assert honeypot.status_code == 400
    assert created.status_code == 201, created.data
    public_request = PublicRequest.objects.get(pk=created.data["id"])
    assert public_request.business == business
    assert public_request.status == PublicRequest.Status.PENDING
    assert public_request.customer_name == "Juan Perez"
    assert public_request.vehicle_license_plate == "AB123CD"
    assert public_request.items.get().service == service

    for index in range(4):
        response = client.post(
            url,
            {**public_request_payload(service), "customer_name": f"Cliente {index}"},
            format="json",
            REMOTE_ADDR="203.0.113.10",
        )
        assert response.status_code == 201
    limited = client.post(
        url,
        {**public_request_payload(service), "customer_name": "Cliente limitado"},
        format="json",
        REMOTE_ADDR="203.0.113.10",
    )
    assert limited.status_code == 429


@pytest.mark.django_db
def test_public_request_create_requires_service_and_derives_type_from_date():
    business = create_business()
    service = create_service(business)
    client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    missing_service = client.post(
        url,
        {
            "customer_name": "Ana Lopez",
            "customer_phone": "11 9999-8888",
            "customer_email": "",
            "service_ids": [],
            "preferred_day": "",
            "website": "",
        },
        format="json",
    )
    quote_request = client.post(
        url,
        {
            "request_type": PublicRequest.RequestType.BOOKING,
            "customer_name": "Luis Gomez",
            "customer_phone": "",
            "customer_email": "luis@example.com",
            "service_ids": [service.id],
            "preferred_time": "11:30:00",
            "website": "",
        },
        format="json",
    )
    booking_request = client.post(
        url,
        {
            "request_type": PublicRequest.RequestType.QUOTE,
            "customer_name": "Maria Gomez",
            "customer_phone": "11 2222-3333",
            "customer_email": "",
            "service_ids": [service.id],
            "preferred_day": "2026-05-24",
            "preferred_time": "11:30:00",
            "website": "",
        },
        format="json",
    )
    missing_contact = client.post(
        url,
        {
            "request_type": PublicRequest.RequestType.QUOTE,
            "customer_name": "Sin contacto",
            "customer_phone": "",
            "customer_email": "",
            "service_ids": [service.id],
            "website": "",
        },
        format="json",
    )

    assert missing_service.status_code == 400
    assert "service_ids" in missing_service.data
    assert quote_request.status_code == 201, quote_request.data
    quote = PublicRequest.objects.get(pk=quote_request.data["id"])
    assert quote.request_type == PublicRequest.RequestType.QUOTE
    assert quote.preferred_day is None
    assert quote.preferred_time is None
    assert quote.items.get().service == service
    assert booking_request.status_code == 201, booking_request.data
    booking = PublicRequest.objects.get(pk=booking_request.data["id"])
    assert booking.request_type == PublicRequest.RequestType.BOOKING
    assert booking.preferred_day.isoformat() == "2026-05-24"
    assert booking.preferred_time.isoformat() == "11:30:00"
    assert booking.items.get().service == service
    assert missing_contact.status_code == 400
    assert "telefono o un email" in str(missing_contact.data)


@pytest.mark.django_db
def test_internal_public_requests_are_employer_only_and_business_scoped(employee_client):
    business_a = employee_client.user.profile.business
    business_b = create_business("Negocio B", "negocio-b")
    service_a = create_service(business_a)
    service_b = create_service(business_b)
    employer_a = create_employer_client(business_a, "dueno-a")
    employer_b = create_employer_client(business_b, "dueno-b")
    PublicRequest.objects.create(
        business=business_a,
        request_type=PublicRequest.RequestType.BOOKING,
        customer_name="Cliente A",
        customer_phone="111",
        preferred_day=date(2026, 5, 22),
    ).items.create(service=service_a, description=service_a.name)
    request_b = PublicRequest.objects.create(
        business=business_b,
        request_type=PublicRequest.RequestType.QUOTE,
        customer_name="Cliente B",
        customer_phone="222",
    )
    request_b.items.create(service=service_b, description=service_b.name)

    employee_response = employee_client.get(reverse("publicrequest-list"))
    list_a = employer_a.get(reverse("publicrequest-list"))
    list_b = employer_b.get(reverse("publicrequest-list"))

    assert employee_response.status_code == 403
    assert [item["customer_name"] for item in list_a.data["results"]] == ["Cliente A"]
    assert [item["customer_name"] for item in list_b.data["results"]] == ["Cliente B"]


@pytest.mark.django_db
def test_public_request_exposes_duplicate_suggestions_and_archives(api_client):
    business = api_client.user.profile.business
    service = create_service(business)
    customer = Customer.objects.create(
        business=business,
        name="Juan Perez",
        phone="1123456789",
        email="juan@example.com",
    )
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="AB123CD",
        brand="Fiat",
        model="Cronos",
    )
    public_request = PublicRequest.objects.create(
        business=business,
        request_type=PublicRequest.RequestType.BOOKING,
        customer_name="Juan Perez",
        customer_phone="11 2345-6789",
        customer_email="juan@example.com",
        vehicle_license_plate="ab123cd",
        preferred_day=date(2026, 5, 22),
        preferred_time=time(10, 30),
    )
    public_request.items.create(service=service, description=service.name)

    detail = api_client.get(reverse("publicrequest-detail", args=[public_request.id]))
    archived = api_client.post(reverse("publicrequest-archive", args=[public_request.id]))

    assert detail.status_code == 200
    assert detail.data["suggestions"]["customers"][0]["id"] == customer.id
    assert detail.data["suggestions"]["vehicles"][0]["id"] == vehicle.id
    assert archived.status_code == 200
    public_request.refresh_from_db()
    assert public_request.status == PublicRequest.Status.ARCHIVED


@pytest.mark.django_db
def test_public_request_list_batches_duplicate_suggestions(api_client):
    business = api_client.user.profile.business
    service = create_service(business)
    for index in range(10):
        customer = Customer.objects.create(
            business=business,
            name=f"Cliente {index}",
            phone=f"110000{index:04d}",
            email=f"cliente{index}@example.com",
        )
        Vehicle.objects.create(
            business=business,
            customer=customer,
            license_plate=f"AA{index:03d}AA",
            brand="Ford",
            model="Focus",
        )
        public_request = PublicRequest.objects.create(
            business=business,
            request_type=PublicRequest.RequestType.BOOKING,
            customer_name=customer.name,
            customer_phone=customer.phone,
            customer_email=customer.email,
            vehicle_license_plate=f"aa{index:03d}aa",
            preferred_day=date(2026, 5, 22),
        )
        public_request.items.create(service=service, description=service.name)

    with CaptureQueriesContext(connection) as queries:
        response = api_client.get(reverse("publicrequest-list"))

    assert response.status_code == 200, response.data
    assert len(queries) <= 8
    first = response.data["results"][0]
    assert first["suggestions"]["customers"]
    assert first["suggestions"]["vehicles"]


@pytest.mark.django_db
def test_public_request_convert_creates_quote_or_reservation_from_confirmed_entities(api_client):
    business = api_client.user.profile.business
    service = create_service(business)
    quote_request = PublicRequest.objects.create(
        business=business,
        request_type=PublicRequest.RequestType.QUOTE,
        customer_name="Ana Lopez",
        customer_phone="1199998888",
        customer_email="ana@example.com",
        vehicle_license_plate="AA111AA",
        vehicle_brand="Toyota",
        vehicle_model="Corolla",
        message="Quiere presupuesto completo.",
    )
    quote_request.items.create(service=service, description=service.name)
    booking_request = PublicRequest.objects.create(
        business=business,
        request_type=PublicRequest.RequestType.BOOKING,
        customer_name="Luis Gomez",
        customer_phone="1177776666",
        vehicle_license_plate="BB222BB",
        vehicle_brand="Ford",
        vehicle_model="Focus",
        preferred_day=date(2026, 5, 23),
        preferred_time=time(15, 0),
        message="Dejarlo por la tarde.",
    )
    booking_request.items.create(service=service, description=service.name)

    quote_response = api_client.post(
        reverse("publicrequest-convert", args=[quote_request.id]),
        {},
        format="json",
    )
    booking_response = api_client.post(
        reverse("publicrequest-convert", args=[booking_request.id]),
        {},
        format="json",
    )

    assert quote_response.status_code == 201, quote_response.data
    assert quote_response.data["created_type"] == "quote"
    quote = Quote.objects.get(pk=quote_response.data["quote"]["id"])
    assert quote.business == business
    assert quote.customer.name == "Ana Lopez"
    assert quote.vehicle.license_plate == "AA111AA"
    assert quote.items.get().service == service
    assert quote_request.__class__.objects.get(pk=quote_request.pk).status == PublicRequest.Status.CONVERTED

    assert booking_response.status_code == 201, booking_response.data
    assert booking_response.data["created_type"] == "reservation"
    reservation = Reservation.objects.get(pk=booking_response.data["reservation"]["id"])
    assert reservation.business == business
    assert reservation.customer.name == "Luis Gomez"
    assert reservation.vehicle.license_plate == "BB222BB"
    assert reservation.day == date(2026, 5, 23)
    assert reservation.start_time == time(15, 0)
    assert reservation.items.get().service == service
    assert booking_request.__class__.objects.get(pk=booking_request.pk).status == PublicRequest.Status.CONVERTED
