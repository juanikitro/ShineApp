from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from core.models import BusinessProfile
from core.soft_delete import SoftDeleteMixin


MONEY_QUANT = Decimal("0.01")


def quantize_money(value):
    return Decimal(value).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def base36(value):
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    number = int(value)
    if number == 0:
        return "0"
    result = ""
    while number:
        number, index = divmod(number, 36)
        result = alphabet[index] + result
    return result


class Quote(SoftDeleteMixin):
    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        SENT = "sent", "Enviada"
        ACCEPTED = "accepted", "Aceptada"
        REJECTED = "rejected", "Rechazada"

    business = models.ForeignKey("core.BusinessAccount", related_name="quotes", on_delete=models.PROTECT)
    customer = models.ForeignKey("customers.Customer", related_name="quotes", on_delete=models.PROTECT)
    vehicle = models.ForeignKey("customers.Vehicle", related_name="quotes", null=True, blank=True, on_delete=models.PROTECT)
    reservation = models.OneToOneField(
        "scheduling.Reservation",
        related_name="quote",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    reservation_day = models.DateField(null=True, blank=True)
    reservation_start_time = models.TimeField(null=True, blank=True)
    public_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    quote_date = models.DateField(default=timezone.localdate)
    valid_until = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    sent_at = models.DateTimeField(null=True, blank=True)
    observations = models.TextField(blank=True)
    business_name = models.CharField(max_length=160, blank=True)
    business_address = models.CharField(max_length=220, blank=True)
    business_cuit = models.CharField(max_length=11, blank=True)
    business_vat_condition_label = models.CharField(max_length=80, blank=True)
    business_contact_phone = models.CharField(max_length=60, blank=True)
    business_contact_email = models.EmailField(blank=True)
    customer_snapshot_name = models.CharField(max_length=160, blank=True)
    customer_snapshot_tax_id = models.CharField(max_length=32, blank=True)
    customer_snapshot_billing_address = models.CharField(max_length=240, blank=True)
    customer_snapshot_phone = models.CharField(max_length=60, blank=True)
    customer_snapshot_email = models.EmailField(blank=True)
    vehicle_snapshot_label = models.CharField(max_length=220, blank=True)
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    discount_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    terms = models.TextField(blank=True)
    payment_instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["-quote_date", "-id"]

    def recalculate(self):
        subtotal = quantize_money(sum((item.line_total for item in self.items.all()), Decimal("0.00")))
        discount_amount = quantize_money(subtotal * self.discount_rate / Decimal("100"))
        taxable_amount = max(subtotal - discount_amount, Decimal("0.00"))
        tax_amount = quantize_money(taxable_amount * self.tax_rate / Decimal("100"))
        self.subtotal = subtotal
        self.discount_amount = discount_amount
        self.taxable_amount = quantize_money(taxable_amount)
        self.tax_amount = tax_amount
        self.total = quantize_money(self.taxable_amount + self.tax_amount)
        self.save(
            update_fields=[
                "subtotal",
                "discount_amount",
                "taxable_amount",
                "tax_amount",
                "total",
                "updated_at",
            ]
        )

    @property
    def status_label(self):
        if self.status == self.Status.DRAFT:
            return "Sin enviar"
        if self.status == self.Status.SENT:
            return "Enviado"
        return self.get_status_display()

    @property
    def has_reservation(self):
        return bool(self.reservation_id)

    def apply_snapshot_defaults(self):
        profile = BusinessProfile.get_solo(business=self.business if self.business_id else None)
        if not self.valid_until:
            self.valid_until = self.quote_date + timedelta(days=profile.default_quote_validity_days)
        if not self.business_name:
            self.business_name = profile.name
        if not self.business_address:
            self.business_address = profile.address
        if not self.business_cuit:
            self.business_cuit = profile.cuit
        if not self.business_vat_condition_label:
            self.business_vat_condition_label = profile.get_vat_condition_display() if profile.vat_condition else ""
        if not self.business_contact_phone:
            self.business_contact_phone = profile.contact_phone
        if not self.business_contact_email:
            self.business_contact_email = profile.contact_email
        if self.tax_rate == Decimal("0.00"):
            self.tax_rate = profile.default_quote_tax_rate
        if self.discount_rate == Decimal("0.00"):
            self.discount_rate = profile.default_quote_discount_rate
        if not self.terms:
            self.terms = profile.default_quote_terms
        if not self.payment_instructions:
            self.payment_instructions = profile.default_quote_payment_instructions
        if self.customer_id:
            if not self.customer_snapshot_name:
                self.customer_snapshot_name = self.customer.name
            if not self.customer_snapshot_tax_id:
                self.customer_snapshot_tax_id = self.customer.tax_id
            if not self.customer_snapshot_billing_address:
                self.customer_snapshot_billing_address = self.customer.billing_address
            if not self.customer_snapshot_phone:
                self.customer_snapshot_phone = self.customer.phone
            if not self.customer_snapshot_email:
                self.customer_snapshot_email = self.customer.email
        if self.vehicle_id and not self.vehicle_snapshot_label:
            self.vehicle_snapshot_label = str(self.vehicle)

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if self.customer_id and not self.business_id:
            self.business = self.customer.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        if is_new and not getattr(self, "_skip_snapshot_defaults", False):
            self.apply_snapshot_defaults()
        super().save(*args, **kwargs)
        if is_new and not self.public_code:
            code = f"{self.quote_date:%d%m%y}-{base36(self.id).zfill(6)[-6:]}"
            type(self).objects.filter(pk=self.pk).update(public_code=code)
            self.public_code = code

    def mark_sent(self):
        if self.status != self.Status.SENT:
            self.status = self.Status.SENT
        if not self.sent_at:
            self.sent_at = timezone.now()
        self.save(update_fields=["status", "sent_at", "updated_at"])

    def delete(self, using=None, keep_parents=False):
        with transaction.atomic():
            for item in list(self.items.all()):
                item.delete()
            self.deleted_at = timezone.now()
            self.save(update_fields=["deleted_at", "updated_at"])

    def __str__(self):
        return f"Cotizacion {self.public_code or self.id or '-'}"


class QuoteItem(SoftDeleteMixin):
    quote = models.ForeignKey(Quote, related_name="items", on_delete=models.CASCADE)
    service = models.ForeignKey("catalog.Service", null=True, blank=True, on_delete=models.SET_NULL)
    description = models.CharField(max_length=180)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["id"]

    def save(self, *args, **kwargs):
        self.line_total = quantize_money(self.quantity * self.unit_price)
        super().save(*args, **kwargs)
