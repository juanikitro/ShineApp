import json
import sys
from datetime import date, time
from decimal import Decimal
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient

from catalog.models import Sector, Service
from catalog.sector_defaults import ensure_default_sectors, SERVICE_TYPE_TO_SECTOR_KEY
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
    ensure_default_sectors(business)
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


def create_service(business, name="Lavado premium", service_type="wash", sector=None):
    if sector is None:
        sector_key = SERVICE_TYPE_TO_SECTOR_KEY.get(service_type, "lavadero")
        sector = Sector.objects.filter(business=business, key=sector_key).first()
        if sector is None:
            sector = Sector.objects.filter(business=business).first()
    return Service.objects.create(
        business=business,
        name=name,
        sector=sector,
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
    assert "price_moto" not in response.data["services"][0]
    assert "price_camioneta" not in response.data["services"][0]
    cache_control = response.headers.get("Cache-Control", "")
    assert "public" in cache_control
    assert "s-maxage" in cache_control


@pytest.mark.django_db
def test_public_landing_exposes_maps_url_when_configured():
    business = create_business()
    client = APIClient()

    empty = client.get(reverse("public-landing", args=[business.slug]))
    assert empty.status_code == 200
    assert empty.data["business"]["maps_url"] == ""

    profile = BusinessProfile.objects.get(business=business)
    profile.maps_url = "https://maps.app.goo.gl/demo"
    profile.save(update_fields=["maps_url", "updated_at"])

    configured = client.get(reverse("public-landing", args=[business.slug]))
    assert configured.status_code == 200
    assert configured.data["business"]["maps_url"] == "https://maps.app.goo.gl/demo"


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


@pytest.mark.django_db
def test_public_request_collects_vehicle_type_and_prices_conversion_by_type(api_client):
    business = api_client.user.profile.business
    service = create_service(business)
    service.price_moto = Decimal("8000.00")
    service.save(update_fields=["price_moto", "updated_at"])

    public_client = APIClient()
    created = public_client.post(
        reverse("public-landing-requests", args=[business.slug]),
        {**public_request_payload(service), "vehicle_type": "moto"},
        format="json",
        REMOTE_ADDR="203.0.113.77",
    )

    assert created.status_code == 201, created.data
    public_request = PublicRequest.objects.get(pk=created.data["id"])
    assert public_request.vehicle_type == "moto"

    convert = api_client.post(
        reverse("publicrequest-convert", args=[public_request.id]),
        {},
        format="json",
    )

    assert convert.status_code == 201, convert.data
    assert convert.data["created_type"] == "reservation"
    assert convert.data["public_request"]["vehicle_type"] == "moto"
    assert convert.data["public_request"]["vehicle_type_label"] == "Moto"
    reservation = Reservation.objects.get(pk=convert.data["reservation"]["id"])
    assert reservation.vehicle.vehicle_type == "moto"
    assert reservation.items.get().unit_price == Decimal("8000.00")


@pytest.mark.django_db
def test_public_landing_exposes_opening_and_closing_time():
    business = create_business()
    profile = BusinessProfile.objects.get(business=business)
    profile.opening_time = time(9, 0)
    profile.closing_time = time(18, 0)
    profile.save(update_fields=["opening_time", "closing_time"])
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    assert response.data["business"]["opening_time"] == "09:00"
    assert response.data["business"]["closing_time"] == "18:00"


@pytest.mark.django_db
def test_public_landing_opening_closing_time_null_when_not_configured():
    business = create_business()
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    assert response.data["business"]["opening_time"] is None
    assert response.data["business"]["closing_time"] is None


@pytest.mark.django_db
def test_public_request_rejects_preferred_time_outside_business_hours():
    business = create_business()
    service = create_service(business)
    profile = BusinessProfile.objects.get(business=business)
    profile.opening_time = time(9, 0)
    profile.closing_time = time(18, 0)
    profile.save(update_fields=["opening_time", "closing_time"])
    client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    base_payload = {
        "customer_name": "Ana Lopez",
        "customer_phone": "11 9999-8888",
        "service_ids": [service.id],
        "preferred_day": "2026-06-15",
        "website": "",
    }

    resp_before_opening = client.post(
        url, {**base_payload, "preferred_time": "08:00:00"}, format="json"
    )
    resp_after_closing = client.post(
        url, {**base_payload, "preferred_time": "19:00:00"}, format="json"
    )
    resp_within_hours = client.post(
        url, {**base_payload, "preferred_time": "10:00:00"}, format="json"
    )
    resp_at_closing = client.post(
        url, {**base_payload, "preferred_time": "18:00:00"}, format="json"
    )
    resp_at_opening = client.post(
        url, {**base_payload, "preferred_time": "09:00:00"}, format="json"
    )

    assert resp_before_opening.status_code == 400
    assert "apertura" in str(resp_before_opening.data)
    assert resp_after_closing.status_code == 400
    assert "cierre" in str(resp_after_closing.data)
    assert resp_within_hours.status_code == 201
    assert resp_at_closing.status_code == 201
    assert resp_at_opening.status_code == 201


@pytest.mark.django_db
def test_public_request_accepts_preferred_time_with_midnight_closing():
    business = create_business()
    service = create_service(business)
    profile = BusinessProfile.objects.get(business=business)
    profile.opening_time = time(8, 0)
    profile.closing_time = time(0, 0)
    profile.save(update_fields=["opening_time", "closing_time"])
    client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    base_payload = {
        "customer_name": "Ana Lopez",
        "customer_phone": "11 9999-8888",
        "service_ids": [service.id],
        "preferred_day": "2026-06-15",
        "website": "",
    }

    resp_afternoon = client.post(
        url, {**base_payload, "preferred_time": "14:00:00"}, format="json"
    )
    resp_early_morning = client.post(
        url, {**base_payload, "preferred_time": "03:00:00"}, format="json"
    )
    resp_at_opening = client.post(
        url, {**base_payload, "preferred_time": "08:00:00"}, format="json"
    )
    resp_at_midnight = client.post(
        url, {**base_payload, "preferred_time": "00:00:00"}, format="json"
    )

    assert resp_afternoon.status_code == 201, resp_afternoon.data
    assert resp_early_morning.status_code == 400
    assert "fuera del horario" in str(resp_early_morning.data)
    assert resp_at_opening.status_code == 201
    assert resp_at_midnight.status_code == 201


@pytest.mark.django_db
def test_public_request_overnight_range_accepts_late_and_early_hours():
    business = create_business()
    service = create_service(business)
    profile = BusinessProfile.objects.get(business=business)
    profile.opening_time = time(22, 0)
    profile.closing_time = time(5, 0)
    profile.save(update_fields=["opening_time", "closing_time"])
    client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    base_payload = {
        "customer_name": "Ana Lopez",
        "customer_phone": "11 9999-8888",
        "service_ids": [service.id],
        "preferred_day": "2026-06-15",
        "website": "",
    }

    resp_late_night = client.post(
        url, {**base_payload, "preferred_time": "23:00:00"}, format="json"
    )
    resp_early_morning = client.post(
        url, {**base_payload, "preferred_time": "03:00:00"}, format="json"
    )
    resp_midday = client.post(
        url, {**base_payload, "preferred_time": "12:00:00"}, format="json"
    )

    assert resp_late_night.status_code == 201, resp_late_night.data
    assert resp_early_morning.status_code == 201, resp_early_morning.data
    assert resp_midday.status_code == 400
    assert "fuera del horario" in str(resp_midday.data)


@pytest.mark.django_db
def test_public_request_no_time_restriction_when_hours_not_configured():
    business = create_business()
    service = create_service(business)
    client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    resp = client.post(
        url,
        {
            "customer_name": "Juan Perez",
            "customer_phone": "11 1111-1111",
            "service_ids": [service.id],
            "preferred_day": "2026-06-15",
            "preferred_time": "23:00:00",
            "website": "",
        },
        format="json",
    )

    assert resp.status_code == 201


@pytest.mark.django_db
def test_public_request_create_sends_email_to_business_users(mailoutbox):
    business = create_business()
    service = create_service(business)
    employer_client = create_employer_client(business)
    employer_client.user.email = "dueno@kingshine.test"
    employer_client.user.save(update_fields=["email"])
    public_client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    resp = public_client.post(url, public_request_payload(service), format="json")

    assert resp.status_code == 201
    assert len(mailoutbox) == 1
    sent = mailoutbox[0]
    assert "dueno@kingshine.test" in sent.to
    assert "Juan Perez" in sent.subject
    assert "turno" in sent.subject
    assert "Juan Perez" in sent.body
    assert "Lavado premium" in sent.body
    assert "shineapp-web.vercel.app" in sent.body


@pytest.mark.django_db
def test_public_request_create_returns_201_even_if_email_fails():
    business = create_business()
    service = create_service(business)
    employer_client = create_employer_client(business)
    employer_client.user.email = "dueno@kingshine.test"
    employer_client.user.save(update_fields=["email"])
    public_client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    with patch("notifications.outbox.send_mail", side_effect=Exception("SMTP error")):
        resp = public_client.post(url, public_request_payload(service), format="json")

    assert resp.status_code == 201
    assert "id" in resp.data


@pytest.mark.django_db
def test_public_request_create_no_email_when_no_users_have_email():
    business = create_business()
    service = create_service(business)
    employer_client = create_employer_client(business)
    employer_client.user.email = ""
    employer_client.user.save(update_fields=["email"])
    public_client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    with patch("notifications.outbox.send_mail") as mock_send:
        resp = public_client.post(url, public_request_payload(service), format="json")

    assert resp.status_code == 201
    mock_send.assert_not_called()


def _make_pywebpush_mock():
    mock_webpush = MagicMock()
    fake_module = ModuleType("pywebpush")
    fake_module.webpush = mock_webpush
    return fake_module, mock_webpush


@pytest.mark.django_db
def test_public_request_create_sends_push_to_business_users_with_subscription():
    from django.test import override_settings
    from core.models import UserProfile

    business = create_business()
    service = create_service(business)
    employer_client = create_employer_client(business)
    subscription = {"endpoint": "https://push.example.com/sub1", "keys": {"p256dh": "key", "auth": "auth"}}
    profile = UserProfile.objects.get(user=employer_client.user)
    profile.push_subscription = subscription
    profile.save(update_fields=["push_subscription"])
    public_client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    fake_module, mock_webpush = _make_pywebpush_mock()
    with override_settings(VAPID_PRIVATE_KEY="fake-key", VAPID_CLAIMS_EMAIL="mailto:test@test.com"):
        with patch.dict(sys.modules, {"pywebpush": fake_module}):
            resp = public_client.post(url, public_request_payload(service), format="json")

    assert resp.status_code == 201
    mock_webpush.assert_called_once()
    call_kwargs = mock_webpush.call_args.kwargs
    assert call_kwargs["subscription_info"] == subscription
    payload = json.loads(call_kwargs["data"])
    assert "turno" in payload["title"]
    assert "Juan Perez" in payload["body"]


@pytest.mark.django_db
def test_public_request_create_no_push_when_no_subscription():
    business = create_business()
    service = create_service(business)
    create_employer_client(business)
    public_client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    fake_module, mock_webpush = _make_pywebpush_mock()
    with patch.dict(sys.modules, {"pywebpush": fake_module}):
        resp = public_client.post(url, public_request_payload(service), format="json")

    assert resp.status_code == 201
    mock_webpush.assert_not_called()


@pytest.mark.django_db
def test_me_patch_saves_push_subscription():
    business = create_business()
    employer_client = create_employer_client(business)
    subscription = {"endpoint": "https://push.example.com/abc", "keys": {"p256dh": "k", "auth": "a"}}

    resp = employer_client.patch(
        reverse("auth-me"),
        {"push_subscription": subscription},
        format="json",
    )

    assert resp.status_code == 200
    from core.models import UserProfile
    profile = UserProfile.objects.get(user=employer_client.user)
    assert profile.push_subscription == subscription


@pytest.mark.django_db
def test_me_patch_rejects_invalid_push_subscription():
    business = create_business()
    employer_client = create_employer_client(business)

    resp = employer_client.patch(
        reverse("auth-me"),
        {"push_subscription": {"keys": "sin-endpoint"}},
        format="json",
    )

    assert resp.status_code == 400
    assert "push_subscription" in resp.data


@pytest.mark.django_db
def test_public_request_time_restriction_ignored_when_no_preferred_time():
    business = create_business()
    service = create_service(business)
    profile = BusinessProfile.objects.get(business=business)
    profile.opening_time = time(9, 0)
    profile.closing_time = time(18, 0)
    profile.save(update_fields=["opening_time", "closing_time"])
    client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    resp = client.post(
        url,
        {
            "customer_name": "Juan Perez",
            "customer_phone": "11 1111-1111",
            "service_ids": [service.id],
            "preferred_day": "2026-06-15",
            "preferred_time": "",
            "website": "",
        },
        format="json",
    )

    assert resp.status_code == 201


# ── recall ────────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=False)
def clear_recall_cache():
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_public_landing_recall_returns_customer_and_vehicles_by_phone(clear_recall_cache):
    business = create_business()
    customer = Customer.objects.create(
        business=business,
        name="Ana Garcia",
        phone="11 6432-1234",
        email="ana@example.com",
    )
    Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="ABC123",
        brand="Toyota",
        model="Corolla",
        vehicle_type="auto",
    )
    client = APIClient()
    url = reverse("public-landing-recall", args=[business.slug])

    resp = client.post(url, {"phone": "1164321234"}, format="json")

    assert resp.status_code == 200
    assert resp.data["customer_name"] == "Ana Garcia"
    assert resp.data["customer_phone"] == "11 6432-1234"
    assert resp.data["customer_email"] == "ana@example.com"
    assert len(resp.data["vehicles"]) == 1
    assert resp.data["vehicles"][0]["license_plate"] == "ABC123"
    assert resp.data["vehicles"][0]["brand"] == "Toyota"
    assert resp.data["vehicles"][0]["vehicle_type"] == "auto"


@pytest.mark.django_db
def test_public_landing_recall_returns_customer_by_email(clear_recall_cache):
    business = create_business()
    Customer.objects.create(
        business=business,
        name="Luis Torres",
        phone="",
        email="luis@example.com",
    )
    client = APIClient()
    url = reverse("public-landing-recall", args=[business.slug])

    resp = client.post(url, {"email": "Luis@EXAMPLE.COM"}, format="json")

    assert resp.status_code == 200
    assert resp.data["customer_name"] == "Luis Torres"
    assert resp.data["vehicles"] == []


@pytest.mark.django_db
def test_public_landing_recall_returns_nulls_when_no_match(clear_recall_cache):
    business = create_business()
    client = APIClient()
    url = reverse("public-landing-recall", args=[business.slug])

    resp = client.post(url, {"phone": "9999999999"}, format="json")

    assert resp.status_code == 200
    assert resp.data["customer_name"] is None
    assert resp.data["customer_phone"] is None
    assert resp.data["customer_email"] is None
    assert resp.data["vehicles"] == []


@pytest.mark.django_db
def test_public_landing_recall_requires_phone_or_email(clear_recall_cache):
    business = create_business()
    client = APIClient()
    url = reverse("public-landing-recall", args=[business.slug])

    resp = client.post(url, {}, format="json")

    assert resp.status_code == 400


@pytest.mark.django_db
def test_public_landing_recall_does_not_expose_other_business_customers(clear_recall_cache):
    business_a = create_business("Shine A", "shine-a")
    business_b = create_business("Shine B", "shine-b")
    Customer.objects.create(
        business=business_b,
        name="Privado B",
        phone="1164321234",
        email="privado@b.test",
    )
    client = APIClient()

    resp = client.post(
        reverse("public-landing-recall", args=[business_a.slug]),
        {"phone": "1164321234"},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["customer_name"] is None


@pytest.mark.django_db
def test_public_landing_recall_rate_limited(clear_recall_cache):
    business = create_business()
    client = APIClient()
    url = reverse("public-landing-recall", args=[business.slug])
    ip = "203.0.113.55"

    for _ in range(3):
        r = client.post(url, {"phone": "1112223333"}, format="json", REMOTE_ADDR=ip)
        assert r.status_code == 200

    limited = client.post(url, {"phone": "1112223333"}, format="json", REMOTE_ADDR=ip)
    assert limited.status_code == 429


@pytest.mark.django_db
def test_public_landing_recall_inactive_customer_is_not_returned(clear_recall_cache):
    business = create_business()
    customer = Customer.objects.create(
        business=business,
        name="Inactivo",
        phone="1164320000",
        email="inactivo@example.com",
    )
    customer.delete()
    client = APIClient()
    url = reverse("public-landing-recall", args=[business.slug])

    resp = client.post(url, {"phone": "1164320000"}, format="json")

    assert resp.status_code == 200
    assert resp.data["customer_name"] is None


FAKE_PUSH_SUBSCRIPTION = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/fake-endpoint",
    "expirationTime": None,
    "keys": {"p256dh": "BFAKE_P256DH_KEY", "auth": "FAKE_AUTH"},
}


@pytest.mark.django_db
def test_public_request_stores_push_subscription():
    business = create_business()
    service = create_service(business)
    client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    response = client.post(
        url,
        {**public_request_payload(service), "push_subscription": FAKE_PUSH_SUBSCRIPTION},
        format="json",
        REMOTE_ADDR="203.0.113.20",
    )

    assert response.status_code == 201, response.data
    public_request = PublicRequest.objects.get(pk=response.data["id"])
    assert public_request.push_subscription == FAKE_PUSH_SUBSCRIPTION
    assert "push_subscription" not in response.data


@pytest.mark.django_db
def test_public_request_push_subscription_validates_format():
    business = create_business()
    service = create_service(business)
    client = APIClient()
    url = reverse("public-landing-requests", args=[business.slug])

    response = client.post(
        url,
        {**public_request_payload(service), "push_subscription": {"no_endpoint": True}},
        format="json",
        REMOTE_ADDR="203.0.113.21",
    )

    assert response.status_code == 400
    assert "push_subscription" in response.data


@pytest.mark.django_db
def test_confirm_reservation_triggers_push_for_linked_public_request(api_client):
    business = api_client.user.profile.business
    service = create_service(business)
    public_client = APIClient()
    created = public_client.post(
        reverse("public-landing-requests", args=[business.slug]),
        {**public_request_payload(service), "push_subscription": FAKE_PUSH_SUBSCRIPTION},
        format="json",
        REMOTE_ADDR="203.0.113.22",
    )
    assert created.status_code == 201
    public_request = PublicRequest.objects.get(pk=created.data["id"])

    convert_response = api_client.post(
        reverse("publicrequest-convert", args=[public_request.id]),
        {},
        format="json",
    )
    assert convert_response.status_code == 201
    reservation_id = convert_response.data["reservation"]["id"]

    with patch("scheduling.views.send_public_request_push") as mock_push:
        confirm_response = api_client.post(
            reverse("reservation-confirm", args=[reservation_id])
        )

    assert confirm_response.status_code == 200
    mock_push.assert_called_once()
    called_with = mock_push.call_args[0][0]
    assert called_with.push_subscription == FAKE_PUSH_SUBSCRIPTION


@pytest.mark.django_db
def test_confirm_reservation_without_public_request_does_not_fail(api_client):
    business = api_client.user.profile.business
    service = create_service(business)
    from customers.models import Customer, Vehicle
    customer = Customer.objects.create(business=business, name="Carlos", phone="1111111111")
    vehicle = Vehicle.objects.create(
        business=business, customer=customer, license_plate="ZZ999ZZ", brand="Honda", model="Civic",
    )
    from scheduling.models import Reservation
    reservation = Reservation.objects.create(
        business=business,
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 6, 10),
    )

    with patch("scheduling.views.send_public_request_push") as mock_push:
        response = api_client.post(
            reverse("reservation-confirm", args=[reservation.id])
        )

    assert response.status_code == 200
    mock_push.assert_not_called()


# ── sector public_visible filter ─────────────────────────────────────────────


@pytest.mark.django_db
def test_public_landing_shows_all_sectors_by_default():
    business = create_business()
    wash = create_service(business, name="Lavado exterior", service_type="wash")
    detail = create_service(business, name="Full detail", service_type="detailing")
    combo = create_service(business, name="Combo total", service_type="combo")
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    ids = {s["id"] for s in response.data["services"]}
    assert wash.id in ids
    assert detail.id in ids
    assert combo.id in ids


@pytest.mark.django_db
def test_public_landing_hides_services_in_sector_marked_not_visible():
    business = create_business()
    detailing_sector = Sector.objects.get(business=business, key="detailing")
    detailing_sector.public_visible = False
    detailing_sector.save(update_fields=["public_visible", "updated_at"])
    wash = create_service(business, name="Lavado exterior", service_type="wash")
    detail = create_service(business, name="Full detail", service_type="detailing")
    combo = create_service(business, name="Combo total", service_type="combo")
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    ids = {s["id"] for s in response.data["services"]}
    assert wash.id in ids
    assert combo.id in ids
    assert detail.id not in ids


@pytest.mark.django_db
def test_public_landing_hides_all_services_when_all_sectors_not_visible():
    business = create_business()
    Sector.objects.filter(business=business).update(public_visible=False)
    create_service(business, name="Lavado exterior", service_type="wash")
    create_service(business, name="Full detail", service_type="detailing")
    create_service(business, name="Combo total", service_type="combo")
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    assert response.data["services"] == []


@pytest.mark.django_db
def test_sector_patch_public_visible_controls_landing_visibility(api_client):
    business = api_client.user.profile.business
    detailing_sector = Sector.objects.get(business=business, key="detailing")

    response = api_client.patch(
        reverse("sector-detail", args=[detailing_sector.id]),
        {"public_visible": False},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["public_visible"] is False
    detailing_sector.refresh_from_db()
    assert detailing_sector.public_visible is False


@pytest.mark.django_db
def test_public_landing_hides_services_listed_in_hidden_service_ids():
    business = create_business()
    visible_wash = create_service(business, name="Lavado exterior", service_type="wash")
    hidden_wash = create_service(business, name="Lavado express", service_type="wash")
    visible_detail = create_service(business, name="Full detail", service_type="detailing")
    hidden_detail = create_service(business, name="Pulido faros", service_type="detailing")
    profile = BusinessProfile.objects.get(business=business)
    profile.public_hidden_service_ids = [hidden_wash.id, hidden_detail.id]
    profile.save(update_fields=["public_hidden_service_ids", "updated_at"])
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    ids = {s["id"] for s in response.data["services"]}
    assert visible_wash.id in ids
    assert visible_detail.id in ids
    assert hidden_wash.id not in ids
    assert hidden_detail.id not in ids


@pytest.mark.django_db
def test_business_profile_patch_normalizes_hidden_service_ids(api_client):
    url = reverse("business-profile")

    response = api_client.patch(
        url,
        {"public_hidden_service_ids": [3, "5", 3, 0, -2, 7]},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["public_hidden_service_ids"] == [3, 5, 7]
    business = api_client.user.profile.business
    profile = BusinessProfile.objects.get(business=business)
    assert profile.public_hidden_service_ids == [3, 5, 7]


@pytest.mark.django_db
def test_business_profile_rejects_non_numeric_hidden_service_ids(api_client):
    url = reverse("business-profile")

    response = api_client.patch(
        url,
        {"public_hidden_service_ids": ["abc"]},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_public_landing_defaults_hide_price_and_show_description():
    business = create_business()
    create_service(business)
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    assert response.data["display"] == {
        "show_service_description": True,
        "show_service_price": False,
    }
    service_payload = response.data["services"][0]
    assert service_payload["notes"] == "Incluye interior y llantas."
    assert "base_price" not in service_payload


@pytest.mark.django_db
def test_public_landing_exposes_price_when_flag_enabled():
    business = create_business()
    service = create_service(business)
    service.price_moto = Decimal("8000.00")
    service.price_camioneta = Decimal("20000.00")
    service.save(update_fields=["price_moto", "price_camioneta", "updated_at"])
    profile = BusinessProfile.objects.get(business=business)
    profile.public_show_service_price = True
    profile.save(update_fields=["public_show_service_price", "updated_at"])
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    assert response.data["display"]["show_service_price"] is True
    service_payload = response.data["services"][0]
    assert service_payload["id"] == service.id
    assert Decimal(service_payload["base_price"]) == Decimal("15000.00")
    assert Decimal(service_payload["price_moto"]) == Decimal("8000.00")
    assert Decimal(service_payload["price_camioneta"]) == Decimal("20000.00")
    assert service_payload["price_combi"] is None


@pytest.mark.django_db
def test_public_landing_hides_description_when_flag_disabled():
    business = create_business()
    create_service(business)
    profile = BusinessProfile.objects.get(business=business)
    profile.public_show_service_description = False
    profile.save(
        update_fields=["public_show_service_description", "updated_at"]
    )
    client = APIClient()

    response = client.get(reverse("public-landing", args=[business.slug]))

    assert response.status_code == 200
    assert response.data["display"]["show_service_description"] is False
    service_payload = response.data["services"][0]
    assert "notes" not in service_payload


@pytest.mark.django_db
def test_business_profile_patch_persists_service_display_flags(api_client):
    url = reverse("business-profile")

    response = api_client.patch(
        url,
        {
            "public_show_service_description": False,
            "public_show_service_price": True,
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.data["public_show_service_description"] is False
    assert response.data["public_show_service_price"] is True
    profile = BusinessProfile.objects.get(business=api_client.user.profile.business)
    assert profile.public_show_service_description is False
    assert profile.public_show_service_price is True
