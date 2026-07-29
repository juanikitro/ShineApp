from django.utils import timezone
from rest_framework import serializers

from core.permissions import business_from_context

from customers.models import Customer
from quotes.models import Quote
from scheduling.models import Reservation
from workorders.models import WorkOrder

from .models import (
    WhatsAppAutomationRule,
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplate,
)
from .services import create_message, normalize_phone, send_message


class WhatsAppConfigSerializer(serializers.ModelSerializer):
    access_token = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
        trim_whitespace=False,
    )
    has_access_token = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppConfig
        fields = [
            "id",
            "mode",
            "provider",
            "is_enabled",
            "phone_number_display",
            "phone_number_id",
            "business_account_id",
            "default_country_code",
            "last_verified_at",
            "has_access_token",
            "access_token",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "last_verified_at", "has_access_token", "created_at", "updated_at"]

    def get_has_access_token(self, obj):
        return bool(obj.access_token)

    def update(self, instance, validated_data):
        token = validated_data.pop("access_token", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if token:
            instance.access_token = token
        instance.save()
        return instance


class WhatsAppTemplateSerializer(serializers.ModelSerializer):
    key_label = serializers.CharField(source="get_key_display", read_only=True)

    class Meta:
        model = WhatsAppTemplate
        fields = [
            "id",
            "key",
            "key_label",
            "provider_template_name",
            "twilio_content_sid",
            "language",
            "category",
            "body_preview",
            "variables_schema",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_variables_schema(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise serializers.ValidationError("Debe ser una lista de nombres de variables.")
        return value


class WhatsAppAutomationRuleSerializer(serializers.ModelSerializer):
    template_label = serializers.CharField(source="template.provider_template_name", read_only=True)
    event_label = serializers.CharField(source="get_event_display", read_only=True)

    class Meta:
        model = WhatsAppAutomationRule
        fields = [
            "id",
            "event",
            "event_label",
            "template",
            "template_label",
            "dispatch",
            "send_delay_minutes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "event", "template_label", "created_at", "updated_at"]

    def validate_template(self, value):
        business = business_from_context(self.context)
        if value and value.business_id != getattr(business, "id", None):
            raise serializers.ValidationError("El template pertenece a otro negocio.")
        return value

    def validate(self, attrs):
        event = attrs.get("event")
        if event is None and self.instance is not None:
            event = self.instance.event
        dispatch = attrs.get(
            "dispatch",
            self.instance.dispatch if self.instance is not None else WhatsAppAutomationRule.Dispatch.MANUAL,
        )
        if event == WhatsAppAutomationRule.Event.QUOTE_SENT and dispatch != WhatsAppAutomationRule.Dispatch.MANUAL:
            raise serializers.ValidationError(
                {"dispatch": "Las cotizaciones enviadas por WhatsApp siempre son manuales."}
            )
        return attrs


class WhatsAppMessageSerializer(serializers.ModelSerializer):
    template_label = serializers.CharField(source="template.provider_template_name", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    event_label = serializers.CharField(source="get_event_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WhatsAppMessage
        fields = [
            "id",
            "recipient_phone",
            "recipient_name",
            "customer",
            "customer_name",
            "vehicle",
            "vehicle_label",
            "reservation",
            "work_order",
            "quote",
            "message_type",
            "event",
            "event_label",
            "template",
            "template_label",
            "template_variables",
            "rendered_body",
            "provider",
            "provider_message_id",
            "provider_response",
            "status",
            "status_label",
            "last_error",
            "attempts",
            "max_attempts",
            "created_by",
            "created_by_username",
            "created_at",
            "sent_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_vehicle_label(self, obj):
        return str(obj.vehicle) if obj.vehicle_id else ""


class ManualWhatsAppMessageSerializer(serializers.Serializer):
    recipient_phone = serializers.CharField(max_length=32)
    recipient_name = serializers.CharField(required=False, allow_blank=True, max_length=160)
    template = serializers.PrimaryKeyRelatedField(
        queryset=WhatsAppTemplate.objects.none(),
        required=False,
        allow_null=True,
    )
    template_variables = serializers.JSONField(required=False)
    rendered_body = serializers.CharField(required=False, allow_blank=True)
    message_type = serializers.ChoiceField(
        choices=WhatsAppMessage.MessageType.choices,
        default=WhatsAppMessage.MessageType.TEMPLATE,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        business = business_from_context(self.context)
        self.fields["template"].queryset = WhatsAppTemplate.objects.filter(business=business)

    def validate(self, attrs):
        message_type = attrs.get("message_type")
        template = attrs.get("template")
        rendered_body = (attrs.get("rendered_body") or "").strip()
        if message_type == WhatsAppMessage.MessageType.TEMPLATE and template is None:
            raise serializers.ValidationError({"template": "Selecciona un template."})
        if message_type == WhatsAppMessage.MessageType.FREE_TEXT and not rendered_body:
            raise serializers.ValidationError({"rendered_body": "Escribe el mensaje."})
        return attrs

    def save(self, **kwargs):
        request = self.context["request"]
        business = business_from_context(self.context)
        attrs = self.validated_data
        message = create_message(
            business=business,
            event=WhatsAppMessage.Event.MANUAL,
            recipient_phone=attrs["recipient_phone"],
            recipient_name=attrs.get("recipient_name", ""),
            template=attrs.get("template"),
            variables=attrs.get("template_variables") or {},
            rendered_body=attrs.get("rendered_body", ""),
            message_type=attrs.get("message_type", WhatsAppMessage.MessageType.TEMPLATE),
            created_by=request.user,
        )
        return send_message(message)


class FreeWhatsAppLogSerializer(serializers.Serializer):
    """Registra en el Historial un envío del modo gratis (wa.me).

    No hace envío server-side: el operador abre WhatsApp desde su propia sesión.
    Solo deja traza (provider=wame, status=sent), sin confirmación de entrega real.
    """

    event = serializers.ChoiceField(choices=WhatsAppMessage.Event.choices)
    rendered_body = serializers.CharField()
    recipient_phone = serializers.CharField(max_length=32)
    recipient_name = serializers.CharField(required=False, allow_blank=True, max_length=160)
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.none(), required=False, allow_null=True
    )
    reservation = serializers.PrimaryKeyRelatedField(
        queryset=Reservation.objects.none(), required=False, allow_null=True
    )
    work_order = serializers.PrimaryKeyRelatedField(
        queryset=WorkOrder.objects.none(), required=False, allow_null=True
    )
    quote = serializers.PrimaryKeyRelatedField(
        queryset=Quote.objects.none(), required=False, allow_null=True
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        business = business_from_context(self.context)
        # Querysets scopeados al negocio: una FK de otro negocio no existe acá => 400.
        self.fields["customer"].queryset = Customer.objects.filter(business=business)
        self.fields["reservation"].queryset = Reservation.objects.filter(business=business)
        self.fields["work_order"].queryset = WorkOrder.objects.filter(business=business)
        self.fields["quote"].queryset = Quote.objects.filter(business=business)

    def validate_rendered_body(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError("Escribe el mensaje.")
        return value

    def save(self, **kwargs):
        request = self.context["request"]
        business = business_from_context(self.context)
        attrs = self.validated_data
        config = WhatsAppConfig.get_solo(business)
        recipient = normalize_phone(
            attrs["recipient_phone"], default_country_code=config.default_country_code
        )
        if not recipient:
            raise serializers.ValidationError({"recipient_phone": "Teléfono inválido."})
        vehicle = None
        reservation = attrs.get("reservation")
        work_order = attrs.get("work_order")
        quote = attrs.get("quote")
        source = reservation or work_order or quote
        if source is not None:
            vehicle = getattr(source, "vehicle", None)
        return WhatsAppMessage.objects.create(
            business=business,
            recipient_phone=recipient,
            recipient_name=attrs.get("recipient_name", ""),
            customer=attrs.get("customer"),
            vehicle=vehicle,
            reservation=reservation,
            work_order=work_order,
            quote=quote,
            message_type=WhatsAppMessage.MessageType.FREE_TEXT,
            event=attrs["event"],
            rendered_body=attrs["rendered_body"],
            provider=WhatsAppConfig.Provider.WAME,
            status=WhatsAppMessage.Status.SENT,
            sent_at=timezone.now(),
            created_by=request.user,
        )
