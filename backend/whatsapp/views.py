import base64
import hashlib
import hmac

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

TWILIO_STATUS_RANK = {
    WhatsAppMessage.Status.PENDING: 0,
    WhatsAppMessage.Status.SENDING: 1,
    WhatsAppMessage.Status.SENT: 2,
    WhatsAppMessage.Status.DELIVERED: 3,
    WhatsAppMessage.Status.READ: 4,
    WhatsAppMessage.Status.FAILED: 5,
    WhatsAppMessage.Status.DEAD: 5,
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
        current_rank = TWILIO_STATUS_RANK.get(message.status, -1)
        new_rank = TWILIO_STATUS_RANK.get(new_status, -1)
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

