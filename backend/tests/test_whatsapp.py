import base64
import hashlib
import hmac
import io
import importlib
import json
from datetime import date
from decimal import Decimal
from unittest import mock
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlencode

import pytest
from django.test import override_settings
from django.urls import reverse

from catalog.models import Service
from core.models import BusinessAccount, BusinessProfile
from customers.models import Customer, Vehicle
from quotes.models import Quote, QuoteItem
from scheduling.models import Reservation
from whatsapp.models import (
    WhatsAppAutomationRule,
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplate,
)
from whatsapp.services import (
    create_message,
    enqueue_automated_message,
    flush_whatsapp_outbox,
    quote_variables,
    reservation_variables,
    send_message,
    work_order_variables,
)


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
        rule.dispatch = WhatsAppAutomationRule.Dispatch.AUTOMATIC
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
@pytest.mark.parametrize(
    "dispatch",
    [
        WhatsAppAutomationRule.Dispatch.NOTIFY,
        WhatsAppAutomationRule.Dispatch.MANUAL,
    ],
)
def test_enqueue_automated_message_skips_non_automatic_dispatch(whatsapp_data, dispatch):
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.CONFIRMED,
    )
    rule = WhatsAppAutomationRule.objects.get(
        business=whatsapp_data["business"],
        event=WhatsAppAutomationRule.Event.RESERVATION_CONFIRMED,
    )
    rule.dispatch = dispatch
    rule.save(update_fields=["dispatch", "updated_at"])

    message = enqueue_automated_message(
        event=WhatsAppMessage.Event.RESERVATION_CONFIRMED,
        source=reservation,
    )

    assert message is None
    assert not WhatsAppMessage.objects.filter(reservation=reservation).exists()


def test_automation_rule_dispatch_data_migration_mapping():
    migration = importlib.import_module("whatsapp.migrations.0004_whatsappautomationrule_dispatch")

    assert migration.dispatch_for_legacy_rule("paid", True) == "automatic"
    assert migration.dispatch_for_legacy_rule("free", True) == "manual"
    assert migration.dispatch_for_legacy_rule("paid", False) == "manual"
    assert migration.dispatch_for_legacy_rule("paid", None) == "manual"
    # Sin config (modo desconocido) una regla enabled NO debe volverse automatic.
    assert migration.dispatch_for_legacy_rule(None, True) == "manual"


@pytest.mark.django_db
def test_reconfirm_reservation_does_not_reenqueue_whatsapp(api_client, whatsapp_data):
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.PENDING,
    )
    url = reverse("reservation-confirm", args=[reservation.id])

    assert api_client.post(url, format="json").status_code == 200
    # Reconfirmar un turno YA confirmado no debe re-encolar (no doble-envio).
    assert api_client.post(url, format="json").status_code == 200

    assert (
        WhatsAppMessage.objects.filter(
            reservation=reservation,
            event=WhatsAppMessage.Event.RESERVATION_CONFIRMED,
        ).count()
        == 1
    )


@pytest.mark.django_db
def test_resetting_ready_status_does_not_reenqueue_whatsapp(api_client, whatsapp_data):
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.CONFIRMED,
    )
    work_order = reservation.work_order
    url = reverse("workorder-status", args=[work_order.id])

    assert api_client.post(url, {"status": Reservation.Status.READY}, format="json").status_code == 200
    # Re-postear el mismo estado "ready" no debe re-encolar (no doble-envio).
    assert api_client.post(url, {"status": Reservation.Status.READY}, format="json").status_code == 200

    assert (
        WhatsAppMessage.objects.filter(
            work_order=work_order,
            event=WhatsAppMessage.Event.WORK_READY,
        ).count()
        == 1
    )


@pytest.mark.django_db
def test_quote_sent_automation_rule_must_be_manual(default_business):
    rule = WhatsAppAutomationRule.objects.create(
        business=default_business,
        event=WhatsAppAutomationRule.Event.QUOTE_SENT,
    )
    from whatsapp.serializers import WhatsAppAutomationRuleSerializer

    serializer = WhatsAppAutomationRuleSerializer(
        rule,
        data={"dispatch": WhatsAppAutomationRule.Dispatch.AUTOMATIC},
        partial=True,
    )

    assert serializer.is_valid() is False
    assert "dispatch" in serializer.errors


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


@pytest.mark.django_db
def test_reservation_send_whatsapp_sends_active_paid_template(api_client, whatsapp_data):
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("reservation-send-whatsapp", args=[reservation.id]),
        format="json",
    )

    assert response.status_code == 201
    assert response.data["message"]["status"] == WhatsAppMessage.Status.SENT
    assert response.data["message"]["reservation"] == reservation.id


@pytest.mark.django_db
def test_reservation_send_whatsapp_rejects_free_mode(api_client, whatsapp_data):
    config = WhatsAppConfig.get_solo(whatsapp_data["business"])
    config.mode = WhatsAppConfig.Mode.FREE
    config.save(update_fields=["mode", "updated_at"])
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("reservation-send-whatsapp", args=[reservation.id]),
        format="json",
    )

    assert response.status_code == 400
    assert not WhatsAppMessage.objects.filter(reservation=reservation).exists()


@pytest.mark.django_db
def test_reservation_send_whatsapp_rejects_missing_active_template(api_client, whatsapp_data):
    template = whatsapp_data["templates"][WhatsAppTemplate.Key.RESERVATION_CONFIRMED]
    template.is_active = False
    template.save(update_fields=["is_active", "updated_at"])
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("reservation-send-whatsapp", args=[reservation.id]),
        format="json",
    )

    assert response.status_code == 400
    assert not WhatsAppMessage.objects.filter(reservation=reservation).exists()


@pytest.mark.django_db
def test_work_order_send_whatsapp_sends_active_paid_template(api_client, whatsapp_data):
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("workorder-send-whatsapp", args=[reservation.work_order.id]),
        {"event": WhatsAppMessage.Event.WORK_READY},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["message"]["status"] == WhatsAppMessage.Status.SENT
    assert response.data["message"]["work_order"] == reservation.work_order.id


@pytest.mark.django_db
def test_work_order_send_whatsapp_rejects_invalid_event(api_client, whatsapp_data):
    reservation = Reservation.objects.create(
        business=whatsapp_data["business"],
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day="2026-06-25",
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("workorder-send-whatsapp", args=[reservation.work_order.id]),
        {"event": "invalid"},
        format="json",
    )

    assert response.status_code == 400
    assert not WhatsAppMessage.objects.filter(work_order=reservation.work_order).exists()


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


def _twilio_status_signature(url, params, auth_token):
    signed = url + "".join(f"{key}{params[key]}" for key in sorted(params))
    digest = hmac.new(
        auth_token.encode("utf-8"),
        signed.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    return base64.b64encode(digest).decode("ascii")


def _post_twilio_status(api_client, params, *, auth_token="twilio-auth-token", signature=None):
    url = reverse("whatsapp-twilio-status-webhook")
    absolute_url = f"http://testserver{url}"
    twilio_signature = signature
    if twilio_signature is None:
        twilio_signature = _twilio_status_signature(absolute_url, params, auth_token)
    return api_client.post(
        url,
        data=urlencode(params),
        content_type="application/x-www-form-urlencoded",
        HTTP_X_TWILIO_SIGNATURE=twilio_signature,
    )


def _twilio_status_message(business, *, provider_message_id="SM123", status=WhatsAppMessage.Status.SENT):
    message = _twilio_template_message(business)
    message.provider_message_id = provider_message_id
    message.status = status
    message.save(update_fields=["provider_message_id", "status", "updated_at"])
    return message


def _meta_template_message(business):
    template = WhatsAppTemplate.objects.create(
        business=business,
        key=WhatsAppTemplate.Key.MANUAL,
        provider_template_name="tpl_manual_meta",
        body_preview="Hola {cliente}, tu vehiculo esta listo.",
        variables_schema=["cliente"],
    )
    message = create_message(
        business=business,
        event=WhatsAppMessage.Event.MANUAL,
        recipient_phone="11 2233-4455",
        recipient_name="Juan Perez",
        template=template,
        variables={"cliente": "Juan Perez"},
    )
    message.provider = WhatsAppConfig.Provider.META
    message.save(update_fields=["provider", "updated_at"])
    return message


def _meta_status_message(business, *, provider_message_id="wamid.123", status=WhatsAppMessage.Status.SENT):
    message = _meta_template_message(business)
    message.provider_message_id = provider_message_id
    message.status = status
    message.save(update_fields=["provider_message_id", "status", "updated_at"])
    return message


def _meta_status_body(provider_message_id, *, status_value="delivered", errors=None):
    status_payload = {
        "id": provider_message_id,
        "status": status_value,
        "timestamp": "1751900000",
    }
    if errors is not None:
        status_payload["errors"] = errors
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": ""},
                            "statuses": [status_payload],
                        }
                    }
                ]
            }
        ]
    }
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


def _meta_status_signature(body, app_secret):
    return hmac.new(app_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def _post_meta_status(api_client, body, *, app_secret="meta-app-secret", signature=None):
    signature_hex = signature
    if signature_hex is None:
        signature_hex = _meta_status_signature(body, app_secret)
    return api_client.generic(
        "POST",
        reverse("whatsapp-meta-status-webhook"),
        data=body,
        content_type="application/json",
        HTTP_X_HUB_SIGNATURE_256=f"sha256={signature_hex}",
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
@override_settings(WHATSAPP_STATUS_CALLBACK_URL="https://api.example.com/api/whatsapp/webhooks/twilio/status/")
def test_twilio_template_with_content_sid_uses_content_api(twilio_config, default_business):
    message = _twilio_template_message(default_business)
    template = message.template
    template.twilio_content_sid = "HX123456789"
    template.variables_schema = ["cliente", "vehiculo"]
    template.save(update_fields=["twilio_content_sid", "variables_schema", "updated_at"])
    message.template_variables = {"cliente": "Juan Perez"}
    message.save(update_fields=["template_variables", "updated_at"])

    fake = _FakeTwilioResponse({"sid": "SM789", "status": "queued"})
    with mock.patch("whatsapp.providers.urlopen", return_value=fake) as mocked:
        send_message(message)

    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.SENT
    assert message.provider_message_id == "SM789"

    form = parse_qs(mocked.call_args[0][0].data.decode("utf-8"))
    assert form["From"] == ["whatsapp:+14155238886"]
    assert form["To"] == ["whatsapp:+541122334455"]
    assert form["ContentSid"] == ["HX123456789"]
    assert json.loads(form["ContentVariables"][0]) == {"1": "Juan Perez", "2": ""}
    assert form["StatusCallback"] == ["https://api.example.com/api/whatsapp/webhooks/twilio/status/"]
    assert "Body" not in form


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


@pytest.mark.django_db
def test_twilio_status_webhook_valid_signature_updates_delivered(api_client, twilio_config, default_business):
    message = _twilio_status_message(default_business, provider_message_id="SMDELIVERED")

    response = _post_twilio_status(
        api_client,
        {
            "AccountSid": twilio_config.business_account_id,
            "MessageSid": "SMDELIVERED",
            "MessageStatus": "delivered",
        },
    )

    assert response.status_code == 204
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.DELIVERED


@pytest.mark.django_db
def test_twilio_status_webhook_invalid_signature_does_not_update(api_client, twilio_config, default_business):
    message = _twilio_status_message(default_business, provider_message_id="SMINVALID")

    response = _post_twilio_status(
        api_client,
        {
            "AccountSid": twilio_config.business_account_id,
            "MessageSid": "SMINVALID",
            "MessageStatus": "delivered",
        },
        signature="invalid-signature",
    )

    assert response.status_code == 403
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.SENT


@pytest.mark.django_db
def test_twilio_status_webhook_unknown_account_returns_404(api_client, twilio_config, default_business):
    message = _twilio_status_message(default_business, provider_message_id="SMUNKNOWN")

    response = _post_twilio_status(
        api_client,
        {
            "AccountSid": "ACUNKNOWN",
            "MessageSid": "SMUNKNOWN",
            "MessageStatus": "delivered",
        },
    )

    assert response.status_code == 404
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.SENT


@pytest.mark.django_db
def test_twilio_status_webhook_ignores_out_of_order_status(api_client, twilio_config, default_business):
    message = _twilio_status_message(
        default_business,
        provider_message_id="SMORDER",
        status=WhatsAppMessage.Status.READ,
    )

    response = _post_twilio_status(
        api_client,
        {
            "AccountSid": twilio_config.business_account_id,
            "MessageSid": "SMORDER",
            "MessageStatus": "sent",
        },
    )

    assert response.status_code == 204
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.READ


@pytest.mark.django_db
def test_twilio_status_webhook_failed_updates_error(api_client, twilio_config, default_business):
    message = _twilio_status_message(default_business, provider_message_id="SMFAILED")

    response = _post_twilio_status(
        api_client,
        {
            "AccountSid": twilio_config.business_account_id,
            "MessageSid": "SMFAILED",
            "MessageStatus": "failed",
            "ErrorCode": "30008",
            "ErrorMessage": "Unknown error",
        },
    )

    assert response.status_code == 204
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.FAILED
    assert "30008" in message.last_error
    assert "Unknown error" in message.last_error


@pytest.mark.django_db
def test_twilio_status_webhook_does_not_downgrade_failed_status(api_client, twilio_config, default_business):
    message = _twilio_status_message(
        default_business,
        provider_message_id="SMSTALE",
        status=WhatsAppMessage.Status.FAILED,
    )

    response = _post_twilio_status(
        api_client,
        {
            "AccountSid": twilio_config.business_account_id,
            "MessageSid": "SMSTALE",
            "MessageStatus": "delivered",
        },
    )

    assert response.status_code == 204
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.FAILED


@pytest.mark.django_db
@override_settings(WHATSAPP_META_WEBHOOK_VERIFY_TOKEN="verify-token")
def test_meta_status_webhook_verify_token_accepts_challenge(api_client):
    response = api_client.get(
        reverse("whatsapp-meta-status-webhook"),
        {
            "hub.mode": "subscribe",
            "hub.verify_token": "verify-token",
            "hub.challenge": "challenge-123",
        },
    )

    assert response.status_code == 200
    assert response.content == b"challenge-123"


@pytest.mark.django_db
@override_settings(WHATSAPP_META_WEBHOOK_VERIFY_TOKEN="verify-token")
def test_meta_status_webhook_verify_token_rejects_invalid_token(api_client):
    response = api_client.get(
        reverse("whatsapp-meta-status-webhook"),
        {
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong-token",
            "hub.challenge": "challenge-123",
        },
    )

    assert response.status_code == 403


@pytest.mark.django_db
@override_settings(WHATSAPP_META_APP_SECRET="meta-app-secret")
def test_meta_status_webhook_valid_signature_updates_delivered(api_client, default_business):
    message = _meta_status_message(default_business, provider_message_id="wamid.delivered")
    body = _meta_status_body("wamid.delivered", status_value="delivered")

    response = _post_meta_status(api_client, body)

    assert response.status_code == 200
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.DELIVERED


@pytest.mark.django_db
@override_settings(WHATSAPP_META_APP_SECRET="meta-app-secret")
def test_meta_status_webhook_invalid_signature_does_not_update(api_client, default_business):
    message = _meta_status_message(default_business, provider_message_id="wamid.invalid")
    body = _meta_status_body("wamid.invalid", status_value="delivered")

    response = _post_meta_status(api_client, body, signature="bad-signature")

    assert response.status_code == 403
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.SENT


@pytest.mark.django_db
@override_settings(WHATSAPP_META_APP_SECRET="meta-app-secret")
def test_meta_status_webhook_unknown_wamid_does_not_update_messages(api_client, default_business):
    message = _meta_status_message(default_business, provider_message_id="wamid.known")
    body = _meta_status_body("wamid.unknown", status_value="delivered")

    response = _post_meta_status(api_client, body)

    assert response.status_code == 200
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.SENT


@pytest.mark.django_db
@override_settings(WHATSAPP_META_APP_SECRET="meta-app-secret")
def test_meta_status_webhook_ignores_out_of_order_status(api_client, default_business):
    message = _meta_status_message(
        default_business,
        provider_message_id="wamid.order",
        status=WhatsAppMessage.Status.READ,
    )
    body = _meta_status_body("wamid.order", status_value="sent")

    response = _post_meta_status(api_client, body)

    assert response.status_code == 200
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.READ


@pytest.mark.django_db
@override_settings(WHATSAPP_META_APP_SECRET="meta-app-secret")
def test_meta_status_webhook_failed_updates_error_text(api_client, default_business):
    message = _meta_status_message(default_business, provider_message_id="wamid.failed")
    body = _meta_status_body(
        "wamid.failed",
        status_value="failed",
        errors=[
            {
                "code": 131026,
                "title": "Message undeliverable",
                "message": "Recipient phone number is not a valid WhatsApp user.",
            }
        ],
    )

    response = _post_meta_status(api_client, body)

    assert response.status_code == 200
    message.refresh_from_db()
    assert message.status == WhatsAppMessage.Status.FAILED
    assert "131026" in message.last_error
    assert "Recipient phone number is not a valid WhatsApp user." in message.last_error


@pytest.mark.django_db
def test_whatsapp_event_variables_include_business_name_first(default_business, whatsapp_data):
    profile = BusinessProfile.get_solo(business=default_business)
    profile.name = "Shine Car Detail Studio"
    profile.save(update_fields=["name", "updated_at"])
    reservation = Reservation.objects.create(
        business=default_business,
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        service=whatsapp_data["service"],
        day=date(2026, 6, 25),
        status=Reservation.Status.CONFIRMED,
    )
    order = reservation.work_order
    quote = Quote.objects.create(
        business=default_business,
        customer=whatsapp_data["customer"],
        vehicle=whatsapp_data["vehicle"],
        reservation=reservation,
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

    reservation_data = reservation_variables(reservation)
    work_order_data = work_order_variables(order)
    quote_data = quote_variables(quote)

    assert list(reservation_data.keys())[0] == "negocio"
    assert list(work_order_data.keys())[0] == "negocio"
    assert list(quote_data.keys())[0] == "negocio"
    assert reservation_data["negocio"] == "Shine Car Detail Studio"
    assert work_order_data["negocio"] == "Shine Car Detail Studio"
    assert quote_data["negocio"] == "Shine Car Detail Studio"


@pytest.mark.django_db
def test_whatsapp_config_mode_default_and_editable(api_client, default_business):
    config = WhatsAppConfig.get_solo(default_business)
    assert config.mode == WhatsAppConfig.Mode.PAID

    get_response = api_client.get(reverse("whatsapp-config"))
    assert get_response.status_code == 200
    assert get_response.data["mode"] == "paid"

    patch_response = api_client.patch(
        reverse("whatsapp-config"),
        {"mode": "free"},
        format="json",
    )
    assert patch_response.status_code == 200
    assert patch_response.data["mode"] == "free"
    config.refresh_from_db()
    assert config.mode == WhatsAppConfig.Mode.FREE


@pytest.mark.django_db
def test_free_mode_does_not_enqueue_reservation_message(api_client, whatsapp_data):
    config = WhatsAppConfig.get_solo(whatsapp_data["business"])
    config.mode = WhatsAppConfig.Mode.FREE
    config.save()
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
    assert not WhatsAppMessage.objects.filter(
        event=WhatsAppMessage.Event.RESERVATION_CONFIRMED
    ).exists()


@pytest.mark.django_db
def test_free_mode_does_not_enqueue_work_ready_message(api_client, whatsapp_data):
    config = WhatsAppConfig.get_solo(whatsapp_data["business"])
    config.mode = WhatsAppConfig.Mode.FREE
    config.save()
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
    assert not WhatsAppMessage.objects.filter(event=WhatsAppMessage.Event.WORK_READY).exists()


@pytest.mark.django_db
def test_free_mode_quote_send_whatsapp_is_blocked(api_client, whatsapp_data):
    config = WhatsAppConfig.get_solo(whatsapp_data["business"])
    config.mode = WhatsAppConfig.Mode.FREE
    config.save()
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

    assert response.status_code == 400
    quote.refresh_from_db()
    assert quote.status == Quote.Status.DRAFT
    assert not WhatsAppMessage.objects.filter(event=WhatsAppMessage.Event.QUOTE_SENT).exists()


@pytest.mark.django_db
def test_free_log_creates_wame_message(api_client, whatsapp_data):
    customer = whatsapp_data["customer"]
    response = api_client.post(
        reverse("whatsapp-free-log"),
        {
            "event": WhatsAppMessage.Event.RESERVATION_CONFIRMED,
            "rendered_body": "Hola Juan, te confirmo el turno.",
            "recipient_phone": "11 2233-4455",
            "recipient_name": "Juan Perez",
            "customer": customer.id,
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["provider"] == WhatsAppConfig.Provider.WAME
    assert response.data["status"] == WhatsAppMessage.Status.SENT
    assert response.data["message_type"] == WhatsAppMessage.MessageType.FREE_TEXT
    assert response.data["recipient_phone"] == "541122334455"
    assert response.data["customer"] == customer.id
    assert response.data["rendered_body"] == "Hola Juan, te confirmo el turno."


@pytest.mark.django_db
def test_free_log_is_employer_only(employee_client, whatsapp_data):
    response = employee_client.post(
        reverse("whatsapp-free-log"),
        {
            "event": WhatsAppMessage.Event.MANUAL,
            "rendered_body": "Hola",
            "recipient_phone": "11 2233-4455",
        },
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_free_log_rejects_foreign_business_customer(api_client, whatsapp_data):
    other_business = BusinessAccount.objects.create(name="Otro Negocio", slug="otro-negocio")
    other_customer = Customer.objects.create(
        business=other_business,
        name="Cliente Ajeno",
        phone="11 0000-0000",
    )

    response = api_client.post(
        reverse("whatsapp-free-log"),
        {
            "event": WhatsAppMessage.Event.MANUAL,
            "rendered_body": "Hola",
            "recipient_phone": "11 2233-4455",
            "customer": other_customer.id,
        },
        format="json",
    )

    assert response.status_code == 400
    assert not WhatsAppMessage.objects.filter(customer=other_customer).exists()
