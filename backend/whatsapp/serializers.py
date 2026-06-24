from rest_framework import serializers

from core.permissions import business_from_context

from .models import (
    WhatsAppAutomationRule,
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplate,
)
from .services import create_message, send_message


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
            "enabled",
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
