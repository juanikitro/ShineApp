from django.conf import settings
from django.db import models
from django.utils import timezone


class WhatsAppConfig(models.Model):
    class Provider(models.TextChoices):
        META = "meta", "Meta Cloud API"
        TWILIO = "twilio", "Twilio"
        FAKE = "fake", "Fake"

    business = models.OneToOneField(
        "core.BusinessAccount",
        related_name="whatsapp_config",
        on_delete=models.CASCADE,
    )
    provider = models.CharField(
        max_length=16,
        choices=Provider.choices,
        default=Provider.META,
    )
    is_enabled = models.BooleanField(default=False)
    phone_number_display = models.CharField(max_length=60, blank=True)
    phone_number_id = models.CharField(max_length=120, blank=True)
    business_account_id = models.CharField(max_length=120, blank=True)
    access_token = models.TextField(blank=True)
    default_country_code = models.CharField(max_length=8, default="+54")
    last_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["business_id"]
        verbose_name = "configuración de WhatsApp"
        verbose_name_plural = "configuraciones de WhatsApp"

    def __str__(self):
        return f"{self.business} - {self.get_provider_display()}"

    @classmethod
    def get_solo(cls, business):
        config, _ = cls.objects.get_or_create(business=business)
        return config


class WhatsAppTemplate(models.Model):
    class Key(models.TextChoices):
        RESERVATION_CONFIRMED = "reservation_confirmed", "Turno confirmado"
        WORK_READY = "work_ready", "Trabajo listo"
        WORK_DELIVERED = "work_delivered", "Trabajo entregado"
        QUOTE_SENT = "quote_sent", "Cotización enviada"
        MANUAL = "manual", "Manual"

    class Category(models.TextChoices):
        UTILITY = "utility", "Utility"
        MARKETING = "marketing", "Marketing"
        AUTHENTICATION = "authentication", "Authentication"
        SERVICE = "service", "Service"

    business = models.ForeignKey(
        "core.BusinessAccount",
        related_name="whatsapp_templates",
        on_delete=models.CASCADE,
    )
    key = models.CharField(max_length=32, choices=Key.choices)
    provider_template_name = models.CharField(max_length=120)
    language = models.CharField(max_length=16, default="es_AR")
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.UTILITY,
    )
    body_preview = models.TextField(blank=True)
    variables_schema = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "key", "provider_template_name", "language"],
                name="uniq_wa_template_per_business_key_name_lang",
            )
        ]

    def __str__(self):
        return f"{self.key} - {self.provider_template_name}"


class WhatsAppAutomationRule(models.Model):
    class Event(models.TextChoices):
        RESERVATION_CONFIRMED = "reservation_confirmed", "Turno confirmado"
        WORK_READY = "work_ready", "Trabajo listo"
        WORK_DELIVERED = "work_delivered", "Trabajo entregado"
        QUOTE_SENT = "quote_sent", "Cotización enviada"

    business = models.ForeignKey(
        "core.BusinessAccount",
        related_name="whatsapp_automation_rules",
        on_delete=models.CASCADE,
    )
    event = models.CharField(max_length=32, choices=Event.choices)
    template = models.ForeignKey(
        WhatsAppTemplate,
        related_name="automation_rules",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    enabled = models.BooleanField(default=False)
    send_delay_minutes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["event"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "event"],
                name="uniq_wa_rule_per_business_event",
            )
        ]

    def __str__(self):
        return f"{self.business} - {self.event}"


class WhatsAppMessage(models.Model):
    class MessageType(models.TextChoices):
        TEMPLATE = "template", "Template"
        FREE_TEXT = "free_text", "Texto libre"

    class Event(models.TextChoices):
        RESERVATION_CONFIRMED = "reservation_confirmed", "Turno confirmado"
        WORK_READY = "work_ready", "Trabajo listo"
        WORK_DELIVERED = "work_delivered", "Trabajo entregado"
        QUOTE_SENT = "quote_sent", "Cotización enviada"
        MANUAL = "manual", "Manual"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        SENDING = "sending", "Enviando"
        SENT = "sent", "Enviado"
        DELIVERED = "delivered", "Entregado"
        READ = "read", "Leído"
        FAILED = "failed", "Fallido"
        DEAD = "dead", "Descartado"

    business = models.ForeignKey(
        "core.BusinessAccount",
        related_name="whatsapp_messages",
        on_delete=models.PROTECT,
    )
    recipient_phone = models.CharField(max_length=32)
    recipient_name = models.CharField(max_length=160, blank=True)
    customer = models.ForeignKey(
        "customers.Customer",
        related_name="whatsapp_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    vehicle = models.ForeignKey(
        "customers.Vehicle",
        related_name="whatsapp_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    reservation = models.ForeignKey(
        "scheduling.Reservation",
        related_name="whatsapp_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    work_order = models.ForeignKey(
        "workorders.WorkOrder",
        related_name="whatsapp_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    quote = models.ForeignKey(
        "quotes.Quote",
        related_name="whatsapp_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    message_type = models.CharField(
        max_length=16,
        choices=MessageType.choices,
        default=MessageType.TEMPLATE,
    )
    event = models.CharField(max_length=32, choices=Event.choices)
    template = models.ForeignKey(
        WhatsAppTemplate,
        related_name="messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    template_variables = models.JSONField(default=dict, blank=True)
    rendered_body = models.TextField(blank=True)
    provider = models.CharField(max_length=16, choices=WhatsAppConfig.Provider.choices)
    provider_message_id = models.CharField(max_length=160, blank=True)
    provider_response = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    last_error = models.TextField(blank=True)
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=5)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_whatsapp_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["business", "status", "-created_at"], name="wa_msg_biz_status_idx"),
            models.Index(fields=["business", "event", "-created_at"], name="wa_msg_biz_event_idx"),
            models.Index(fields=["status", "created_at"], name="wa_msg_status_created_idx"),
        ]

    def __str__(self):
        return f"{self.event} -> {self.recipient_phone} [{self.status}]"

    def mark_sent(self, *, provider_message_id="", provider_response=None):
        self.status = self.Status.SENT
        self.provider_message_id = provider_message_id or self.provider_message_id
        self.provider_response = provider_response or self.provider_response
        self.sent_at = timezone.now()
        self.last_error = ""
        self.save(
            update_fields=[
                "status",
                "provider_message_id",
                "provider_response",
                "sent_at",
                "last_error",
                "updated_at",
            ]
        )

