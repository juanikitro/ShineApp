import base64
import io
import json
from decimal import Decimal
from unittest import mock
from urllib.error import HTTPError
from urllib.parse import parse_qs

import pytest
from django.urls import reverse

from catalog.models import Service
from customers.models import Customer, Vehicle
from quotes.models import Quote, QuoteItem
from scheduling.models import Reservation
from whatsapp.models import (
    WhatsAppAutomationRule,
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplate,
)
from whatsapp.services import create_message, flush_whatsapp_outbox, send_message


@pytest.fixture
def whatsapp_data(default_business):
    sector = default_business.sectors.first()
    service = Service.objects.create(
        business=default_business,
        sector=sector,
        name="Lavado premium",
        base_price=Decimal("10000.00"),
    )
    customer = Customer.objects.create(
        business=default_business,
        name="Juan Perez",
        phone="11 2233-4455",
        email="juan@example.com",
    )
    vehicle = Vehicle.objects.create(
        business=default_business,
        customer=customer,
        license_plate="AA123BB",
        brand="Ford",
        model="Fiesta",
    )
    config = WhatsAppConfig.get_solo(default_business)
    config.provider = WhatsAppConfig.Provider.FAKE
    config.is_enabled = True
    config.phone_number_display = "+54 9 11 5555-5555"
    config.default_country_code = "+54"
    config.save()
    templates = {
        key: WhatsAppTemplate.objects.create(
            business=default_business,
            key=key,
            provider_template_name=f"tpl_{key}",
            body_preview="Hola {cliente}, {servicios} para {vehiculo}.",
            variables_schema=["cliente", "servicios", "vehiculo"],
        )
        for key in [
            WhatsAppTemplate.Key.RESERVATION_CONFIRMED,
            WhatsAppTemplate.Key.WORK_READY,
            WhatsAppTemplate.Key.QUOTE_SENT,
        ]
    }
    for event, template_key in [
        (WhatsAppAutomationRule.Event.RESERVATION_CONFIRMED, WhatsAppTemplate.Key.RESERVATION_CONFIRMED),
        (WhatsAppAutomationRule.Event.WORK_READY, WhatsAppTemplate.Key.WORK_READY),
    ]:
        rule, _ = WhatsAppAutomationRule.objects.get_or_create(
            business=default_business,
            event=event,
        )
        rule.template = templates[template_key]
        rule.enabled = True
        rule.save()
    return {
        "business": default_business,
        "service": service,
        "customer": customer,
        "vehicle": vehicle,
        "templates": templates,
    }


@pytest.mark.django_db
def test_whatsapp_config_is_employer_only(api_client, employee_client):
    employee_response = employee_client.get(reverse("whatsapp-config"))
    assert employee_response.status_code == 403

    response = api_client.patch(
        reverse("whatsapp-config"),
        {
            "provider": "fake",
            "is_enabled": True,
            "phone_number_display": "+54 9 11 5555-5555",
            "access_token": "not-a-real-token-for-tests",
        },
        format="json",
    )
    assert response.status_code == 200
    assert response.data["provider"] == "fake"
    assert response.data["has_access_token"] is True
    assert "access_token" not in response.data


@pytest.mark.django_db
def test_manual_whatsapp_message_sends_with_fake_provider(api_client, whatsapp_data):
    template = whatsapp_data["templates"][WhatsAppTemplate.Key.RESERVATION_CONFIRMED]
    response = api_client.post(
        reverse("whatsapp-message-send-manual"),
        {
            "recipient_phone": "11 2233-4455",
            "recipient_name": "Juan Perez",
            "template": template.id,
            "template_variables": {
                "cliente": "Juan Perez",
                "servicios": "Lavado premium",
                "vehiculo": "AA123BB",
            },
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["status"] == WhatsAppMessage.Status.SENT
    assert response.data["recipient_phone"] == "541122334455"
    assert response.data["provider_message_id"].startswith("fake-wa-")


@pytest.mark.django_db
def test_confirm_reservation_enqueues_and_sends_whatsapp(api_client, whatsapp_data):
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.PENDING,
    )

    response = api_client.post(reverse("reservation-confirm", args=[reservation.id]), format="json")

    assert response.status_code == 200
    message = WhatsAppMessage.objects.get(event=WhatsAppMessage.Event.RESERVATION_CONFIRMED)
    assert message.status == WhatsAppMessage.Status.PENDING
    assert message.reservation_id == reservation.id
    assert message.customer_id == whatsapp_data["customer"].id
    result = flush_whatsapp_outbox()
    message.refresh_from_db()
    assert result["sent"] == 1
    assert message.status == WhatsAppMessage.Status.SENT


@pytest.mark.django_db
def test_work_ready_enqueues_and_sends_whatsapp(api_client, whatsapp_data):
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.CONFIRMED,
    )
    order = reservation.work_order

    response = api_client.post(
        reverse("workorder-status", args=[order.id]),
        {"status": Reservation.Status.READY},
        format="json",
    )

    assert response.status_code == 200
    message = WhatsAppMessage.objects.get(event=WhatsAppMessage.Event.WORK_READY)
    assert message.work_order_id == order.id
    result = flush_whatsapp_outbox()
    message.refresh_from_db()
    assert result["sent"] == 1
    assert message.status == WhatsAppMessage.Status.SENT


@pytest.mark.django_db
def test_quote_send_whatsapp_marks_quote_sent(api_client, whatsapp_data):
    quote = Quote.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        status=Quote.Status.DRAFT,
    )
    QuoteItem.objects.create(
        quote=quote,
        service=whatsapp_data["service"],
        description="Lavado premium",
        quantity=Decimal("1.00"),
        unit_price=Decimal("10000.00"),
    )
    quote.recalculate()

    response = api_client.post(reverse("quote-send-whatsapp", args=[quote.id]), format="json")

    assert response.status_code == 201
    quote.refresh_from_db()
    assert quote.status == Quote.Status.SENT
    assert response.data["message"]["status"] == WhatsAppMessage.Status.SENT
    assert response.data["message"]["quote"] == quote.id


class _FakeTwilioResponse:
    def __init__(self, payload):
        self._payload = payload

    def read(self):
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


@pytest.fixture
def twilio_config(default_business):
    config = WhatsAppConfig.get_solo(default_business)
    config.provider = WhatsAppConfig.Provider.TWILIO
    config.is_enabled = True
    config.business_account_id = "AC123456789"
    config.access_token = "twilio-auth-token"
    config.phone_number_id = "whatsapp:+14155238886"
    config.default_country_code = "+54"
    config.save()
    return config


def _twilio_template_message(business):
    template = WhatsAppTemplate.objects.create(
        business=business,
        key=WhatsAppTemplate.Key.MANUAL,
        provider_template_name="tpl_manual",
        body_preview="Hola {cliente}, tu vehículo está listo.",
        variables_schema=["cliente"],
    )
    return create_message(
        business=business,
        event=WhatsAppMessage.Event.MANUAL,
        recipient_phone="11 2233-4455",
        recipient_name="Juan Perez",
        template=template,
        variables={"cliente": "Juan Perez"},
    )


@pytest.mark.django_db
def test_twilio_template_message_sends_rendered_body(twilio_config, default_business):
    message = _twilio_template_message(default_business)

    fake = _FakeTwilioResponse({"sid": "SM123", "status": "queued"})
    with mock.patch("whatsapp.providers.urlopen", return_value=fake) as mocked:
        send_message(message)

    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.SENT
    assert message.provider_message_id == "SM123"

    request = mocked.call_args[0][0]
    assert request.full_url == "https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json"
    expected_auth = base64.b64encode(b"AC123456789:twilio-auth-token").decode("ascii")
    assert request.get_header("Authorization") == f"Basic {expected_auth}"
    form = parse_qs(request.data.decode("utf-8"))
    assert form["From"] == ["whatsapp:+14155238886"]
    assert form["To"] == ["whatsapp:+541122334455"]
    assert form["Body"] == ["Hola Juan Perez, tu vehículo está listo."]


@pytest.mark.django_db
@pytest.mark.parametrize("raw_from", ["+14155238886", "14155238886", "whatsapp:+1 415 523-8886"])
def test_twilio_from_number_formats_are_normalized(twilio_config, default_business, raw_from):
    twilio_config.phone_number_id = raw_from
    twilio_config.save()
    message = create_message(
        business=default_business,
        event=WhatsAppMessage.Event.MANUAL,
        recipient_phone="11 2233-4455",
        rendered_body="Hola!",
        message_type=WhatsAppMessage.MessageType.FREE_TEXT,
    )

    fake = _FakeTwilioResponse({"sid": "SM456", "status": "queued"})
    with mock.patch("whatsapp.providers.urlopen", return_value=fake) as mocked:
        send_message(message)

    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.SENT
    form = parse_qs(mocked.call_args[0][0].data.decode("utf-8"))
    assert form["From"] == ["whatsapp:+14155238886"]
    assert form["Body"] == ["Hola!"]


@pytest.mark.django_db
def test_twilio_http_error_marks_message_failed(twilio_config, default_business):
    message = _twilio_template_message(default_business)

    error_body = json.dumps({"code": 21212, "message": "Invalid From number"}).encode("utf-8")
    http_error = HTTPError(
        "https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json",
        400,
        "Bad Request",
        None,
        io.BytesIO(error_body),
    )
    with mock.patch("whatsapp.providers.urlopen", side_effect=http_error):
        send_message(message)

    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.FAILED
    assert "21212" in message.last_error


@pytest.mark.django_db
def test_twilio_missing_credentials_fails_with_clear_error(twilio_config, default_business):
    twilio_config.access_token = ""
    twilio_config.save()
    message = _twilio_template_message(default_business)

    send_message(message)

    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.FAILED
    assert "credenciales de Twilio" in message.last_error
