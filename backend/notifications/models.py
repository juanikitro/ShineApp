from django.db import models
from django.utils import timezone

from core.models import VehicleType


class PublicRequest(models.Model):
    class RequestType(models.TextChoices):
        BOOKING = "booking", "Turno"
        QUOTE = "quote", "Cotizacion"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        CONVERTED = "converted", "Convertida"
        ARCHIVED = "archived", "Archivada"

    business = models.ForeignKey(
        "core.BusinessAccount",
        related_name="public_requests",
        on_delete=models.PROTECT,
    )
    request_type = models.CharField(max_length=16, choices=RequestType.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    customer_name = models.CharField(max_length=160)
    customer_phone = models.CharField(max_length=60, blank=True)
    customer_email = models.EmailField(blank=True)
    vehicle_license_plate = models.CharField(max_length=20, blank=True)
    vehicle_brand = models.CharField(max_length=80, blank=True)
    vehicle_model = models.CharField(max_length=80, blank=True)
    vehicle_color = models.CharField(max_length=60, blank=True)
    vehicle_type = models.CharField(
        max_length=20,
        choices=VehicleType.choices,
        default=VehicleType.AUTO,
    )
    preferred_day = models.DateField(null=True, blank=True)
    preferred_time = models.TimeField(null=True, blank=True)
    message = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    push_subscription = models.JSONField(null=True, blank=True)
    converted_reservation = models.OneToOneField(
        "scheduling.Reservation",
        related_name="public_request",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    converted_quote = models.OneToOneField(
        "quotes.Quote",
        related_name="public_request",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    converted_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["business", "status", "-created_at"],
                name="notificatio_busines_1b5778_idx",
            ),
            models.Index(
                fields=["ip_address", "-created_at"],
                name="notificatio_ip_addr_d37b69_idx",
            ),
        ]

    def __str__(self):
        return f"{self.get_request_type_display()} - {self.customer_name}"

    def save(self, *args, **kwargs):
        self.customer_name = self.customer_name.strip()
        self.customer_phone = self.customer_phone.strip()
        self.customer_email = self.customer_email.strip().lower()
        self.vehicle_license_plate = self.vehicle_license_plate.strip().upper()
        self.vehicle_brand = self.vehicle_brand.strip()
        self.vehicle_model = self.vehicle_model.strip()
        self.vehicle_color = self.vehicle_color.strip()
        self.user_agent = self.user_agent[:500]
        super().save(*args, **kwargs)

    def mark_archived(self):
        self.status = self.Status.ARCHIVED
        self.archived_at = timezone.now()
        self.save(update_fields=["status", "archived_at", "updated_at"])

    def mark_converted(self, *, reservation=None, quote=None):
        self.status = self.Status.CONVERTED
        self.converted_at = timezone.now()
        if reservation is not None:
            self.converted_reservation = reservation
        if quote is not None:
            self.converted_quote = quote
        self.save(
            update_fields=[
                "status",
                "converted_at",
                "converted_reservation",
                "converted_quote",
                "updated_at",
            ],
        )


class PublicRequestItem(models.Model):
    public_request = models.ForeignKey(PublicRequest, related_name="items", on_delete=models.CASCADE)
    service = models.ForeignKey("catalog.Service", null=True, blank=True, on_delete=models.SET_NULL)
    description = models.CharField(max_length=180)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        if not self.description and self.service_id:
            self.description = self.service.name
        super().save(*args, **kwargs)


class NotificationOutbox(models.Model):
    """Cola persistente de notificaciones por email.

    El envio sigue siendo best-effort inline (no rompe la UX actual): al encolar
    se intenta mandar el mail una vez con timeout; si falla, la fila queda
    pendiente y el job de mantenimiento la reintenta hasta `max_attempts`,
    momento en que pasa a `dead` (dead-letter) para inspeccion manual desde
    admin. Asi ningun aviso se pierde en silencio y los fallos quedan visibles.
    """

    class Kind(models.TextChoices):
        EMAIL = "email", "Email"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        SENT = "sent", "Enviado"
        FAILED = "failed", "Fallido"
        DEAD = "dead", "Descartado"

    business = models.ForeignKey(
        "core.BusinessAccount",
        related_name="notification_outbox",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.EMAIL)
    event = models.CharField(max_length=64, blank=True)
    recipient = models.CharField(max_length=320)
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=5)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="outbox_status_created_idx"),
        ]

    def __str__(self):
        return f"{self.kind}:{self.event} -> {self.recipient} [{self.status}]"
