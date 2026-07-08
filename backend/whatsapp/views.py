import base64
import hashlib
import hmac
import json

from django.conf import settings
from django.http import HttpResponse
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.views import APIView

from core.permissions import EmployerOnly, business_from_request

from .models import (
    WhatsAppAutomationRule,
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplate,
)
from .serializers import (
    FreeWhatsAppLogSerializer,
    ManualWhatsAppMessageSerializer,
    WhatsAppAutomationRuleSerializer,
    WhatsAppConfigSerializer,
    WhatsAppMessageSerializer,
    WhatsAppTemplateSerializer,
)


TWILIO_STATUS_MAP = {
    "queued": WhatsAppMessage.Status.SENDING,
    "sending": WhatsAppMessage.Status.SENDING,
    "sent": WhatsAppMessage.Status.SENT,
    "delivered": WhatsAppMessage.Status.DELIVERED,
    "read": WhatsAppMessage.Status.READ,
    "failed": WhatsAppMessage.Status.FAILED,
    "undelivered": WhatsAppMessage.Status.FAILED,
}

WHATSAPP_STATUS_RANK = {
    WhatsAppMessage.Status.PENDING: 0,
    WhatsAppMessage.Status.SENDING: 1,
    WhatsAppMessage.Status.SENT: 2,
    WhatsAppMessage.Status.DELIVERED: 3,
    WhatsAppMessage.Status.READ: 4,
    WhatsAppMessage.Status.FAILED: 5,
    WhatsAppMessage.Status.DEAD: 5,
}

TWILIO_STATUS_RANK = WHATSAPP_STATUS_RANK

META_STATUS_MAP = {
    "sent": WhatsAppMessage.Status.SENT,
    "delivered": WhatsAppMessage.Status.DELIVERED,
    "read": WhatsAppMessage.Status.READ,
    "failed": WhatsAppMessage.Status.FAILED,
}


def twilio_signature_for(url, params, auth_token):
    signed = url + "".join(f"{key}{params[key]}" for key in sorted(params))
    digest = hmac.new(
        auth_token.encode("utf-8"),
        signed.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    return base64.b64encode(digest).decode("ascii")


def twilio_signature_is_valid(request, auth_token, params):
    expected = twilio_signature_for(request.build_absolute_uri(), params, auth_token)
    provided = request.META.get("HTTP_X_TWILIO_SIGNATURE", "")
    return hmac.compare_digest(expected, provided)


def ensure_default_rules(business):
    for event, _label in WhatsAppAutomationRule.Event.choices:
        WhatsAppAutomationRule.objects.get_or_create(business=business, event=event)


class WhatsAppConfigView(APIView):
    permission_classes = [EmployerOnly]

    def get_object(self):
        return WhatsAppConfig.get_solo(business_from_request(self.request))

    def get(self, request):
        return response.Response(WhatsAppConfigSerializer(self.get_object()).data)

    def patch(self, request):
        serializer = WhatsAppConfigSerializer(
            self.get_object(),
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)


class WhatsAppFreeLogView(APIView):
    """Registra un envío del modo gratis (wa.me) en el Historial.

    No envía nada por servidor; solo deja traza del mensaje que el operador
    abrió en su propia sesión de WhatsApp.
    """

    permission_classes = [EmployerOnly]

    def post(self, request):
        serializer = FreeWhatsAppLogSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return response.Response(
            WhatsAppMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


class WhatsAppTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppTemplateSerializer
    permission_classes = [EmployerOnly]

    def get_queryset(self):
        return WhatsAppTemplate.objects.filter(
            business=business_from_request(self.request)
        ).order_by("key", "id")

    def perform_create(self, serializer):
        serializer.save(business=business_from_request(self.request))


class WhatsAppAutomationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppAutomationRuleSerializer
    permission_classes = [EmployerOnly]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        business = business_from_request(self.request)
        ensure_default_rules(business)
        return WhatsAppAutomationRule.objects.select_related("template").filter(business=business)


class WhatsAppMessageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WhatsAppMessageSerializer
    permission_classes = [EmployerOnly]

    def get_queryset(self):
        queryset = WhatsAppMessage.objects.select_related(
            "customer",
            "vehicle",
            "reservation",
            "work_order",
            "quote",
            "template",
            "created_by",
        ).filter(business=business_from_request(self.request))
        for field in ["status", "event", "customer", "reservation", "quote"]:
            value = self.request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        return queryset

    @decorators.action(detail=False, methods=["post"], url_path="send-manual")
    def send_manual(self, request):
        serializer = ManualWhatsAppMessageSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return response.Response(
            WhatsAppMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


class TwilioWhatsAppStatusWebhookView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        params = {key: value for key, value in request.POST.items()}
        account_sid = (params.get("AccountSid") or "").strip()
        message_sid = (params.get("MessageSid") or "").strip()
        message_status = (params.get("MessageStatus") or "").strip().lower()
        if not account_sid or not message_sid or not message_status:
            return response.Response(
                {"detail": "Faltan campos obligatorios del webhook de Twilio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        config = WhatsAppConfig.objects.filter(
            provider=WhatsAppConfig.Provider.TWILIO,
            business_account_id=account_sid,
        ).select_related("business").first()
        if config is None:
            return response.Response(status=status.HTTP_404_NOT_FOUND)
        if not twilio_signature_is_valid(request, config.access_token or "", params):
            return response.Response(status=status.HTTP_403_FORBIDDEN)

        message = WhatsAppMessage.objects.filter(
            business=config.business,
            provider=WhatsAppConfig.Provider.TWILIO,
            provider_message_id=message_sid,
        ).first()
        if message is None:
            return response.Response(status=status.HTTP_404_NOT_FOUND)

        new_status = TWILIO_STATUS_MAP.get(message_status)
        if new_status is None:
            return response.Response(status=status.HTTP_204_NO_CONTENT)
        current_rank = WHATSAPP_STATUS_RANK.get(message.status, -1)
        new_rank = WHATSAPP_STATUS_RANK.get(new_status, -1)
        if new_rank < current_rank:
            return response.Response(status=status.HTTP_204_NO_CONTENT)

        update_fields = []
        if message.status != new_status:
            message.status = new_status
            update_fields.append("status")

        error_parts = [
            (params.get("ErrorCode") or "").strip(),
            (params.get("ErrorMessage") or "").strip(),
        ]
        error_text = " - ".join(part for part in error_parts if part)
        if error_text and message.last_error != error_text:
            message.last_error = error_text
            update_fields.append("last_error")

        if update_fields:
            update_fields.append("updated_at")
            message.save(update_fields=update_fields)

        return response.Response(status=status.HTTP_204_NO_CONTENT)


def meta_signature_is_valid(raw_body, app_secret, provided):
    if not app_secret or not provided.startswith("sha256="):
        return False
    provided_hex = provided.removeprefix("sha256=")
    expected_hex = hmac.new(
        app_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected_hex, provided_hex)


def meta_status_error_text(status_payload):
    errors = status_payload.get("errors")
    if not isinstance(errors, list):
        return ""
    parts = []
    for item in errors:
        if not isinstance(item, dict):
            continue
        code = str(item.get("code") or "").strip()
        message = str(item.get("message") or item.get("title") or "").strip()
        text = " - ".join(part for part in [code, message] if part)
        if text:
            parts.append(text)
    return "; ".join(parts)[:2000]


class MetaWhatsAppStatusWebhookView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        verify_token = getattr(settings, "WHATSAPP_META_WEBHOOK_VERIFY_TOKEN", "")
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")
        if (
            verify_token
            and mode == "subscribe"
            and token is not None
            and hmac.compare_digest(verify_token, token)
            and challenge is not None
        ):
            return HttpResponse(challenge, status=200, content_type="text/plain")
        return response.Response(status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        app_secret = getattr(settings, "WHATSAPP_META_APP_SECRET", "")
        raw_body = request.body
        signature = request.META.get("HTTP_X_HUB_SIGNATURE_256", "")
        if not meta_signature_is_valid(raw_body, app_secret, signature):
            return response.Response(status=status.HTTP_403_FORBIDDEN)

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            return response.Response(status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(payload, dict) or not isinstance(payload.get("entry"), list):
            return response.Response(status=status.HTTP_400_BAD_REQUEST)

        expected_phone_number_id = getattr(settings, "WHATSAPP_META_PHONE_NUMBER_ID", "")
        try:
            for entry in payload["entry"]:
                changes = entry.get("changes")
                if not isinstance(changes, list):
                    return response.Response(status=status.HTTP_400_BAD_REQUEST)
                for change in changes:
                    value = change.get("value")
                    if not isinstance(value, dict):
                        return response.Response(status=status.HTTP_400_BAD_REQUEST)
                    metadata = value.get("metadata") or {}
                    phone_number_id = str(metadata.get("phone_number_id") or "")
                    if (
                        phone_number_id
                        and expected_phone_number_id
                        and phone_number_id != expected_phone_number_id
                    ):
                        continue
                    statuses = value.get("statuses")
                    if statuses is None:
                        continue
                    if not isinstance(statuses, list):
                        return response.Response(status=status.HTTP_400_BAD_REQUEST)
                    for status_payload in statuses:
                        if not isinstance(status_payload, dict):
                            return response.Response(status=status.HTTP_400_BAD_REQUEST)
                        self._process_status(status_payload)
        except AttributeError:
            return response.Response(status=status.HTTP_400_BAD_REQUEST)

        return response.Response(status=status.HTTP_200_OK)

    def _process_status(self, status_payload):
        provider_message_id = str(status_payload.get("id") or "").strip()
        new_status = META_STATUS_MAP.get(str(status_payload.get("status") or "").strip().lower())
        if not provider_message_id or new_status is None:
            return

        message = WhatsAppMessage.objects.filter(
            provider=WhatsAppConfig.Provider.META,
            provider_message_id=provider_message_id,
        ).first()
        if message is None:
            return

        current_rank = WHATSAPP_STATUS_RANK.get(message.status, -1)
        new_rank = WHATSAPP_STATUS_RANK.get(new_status, -1)
        if new_rank < current_rank:
            return

        update_fields = []
        if message.status != new_status:
            message.status = new_status
            update_fields.append("status")

        if new_status == WhatsAppMessage.Status.FAILED:
            error_text = meta_status_error_text(status_payload)
            if error_text and message.last_error != error_text:
                message.last_error = error_text
                update_fields.append("last_error")

        if update_fields:
            update_fields.append("updated_at")
            message.save(update_fields=update_fields)

