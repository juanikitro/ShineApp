import calendar
from datetime import date

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import VehicleType
from core.soft_delete import SoftDeleteMixin


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Customer(SoftDeleteMixin, TimeStampedModel):
    business = models.ForeignKey("core.BusinessAccount", related_name="customers", on_delete=models.PROTECT)
    name = models.CharField(max_length=160)
    phone = models.CharField(max_length=60, blank=True)
    email = models.EmailField(blank=True)
    tax_id = models.CharField(max_length=32, blank=True)
    billing_address = models.CharField(max_length=240, blank=True)
    birthday_month = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    birthday_day = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["name"]
        verbose_name = "cliente"
        verbose_name_plural = "clientes"
        indexes = [
            models.Index(fields=["business", "name"], name="customer_biz_name_idx"),
        ]

    def __str__(self):
        return self.name

    def _birthday_for_year(self, year):
        if not self.birthday_month or not self.birthday_day:
            return None
        if self.birthday_month == 2 and self.birthday_day == 29 and not calendar.isleap(year):
            # En anios no bisiestos el cumpleanos del 29/02 se avisa el 28/02.
            return date(year, 2, 28)
        return date(year, self.birthday_month, self.birthday_day)

    @property
    def birthday_label(self):
        if not self.birthday_month or not self.birthday_day:
            return ""
        return f"{self.birthday_day:02d}/{self.birthday_month:02d}"

    def _next_birthday_from(self, today):
        next_day = self._birthday_for_year(today.year)
        if next_day is None or next_day >= today:
            return next_day
        return self._birthday_for_year(today.year + 1)

    @property
    def next_birthday(self):
        return self._next_birthday_from(timezone.localdate())

    @property
    def days_until_birthday(self):
        today = timezone.localdate()
        next_day = self._next_birthday_from(today)
        if next_day is None:
            return None
        return (next_day - today).days

    @property
    def has_birthday_alert(self):
        days_until = self.days_until_birthday
        return days_until is not None and days_until <= 3

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])

    def save(self, *args, **kwargs):
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        self.tax_id = "".join(character for character in str(self.tax_id) if character.isdigit())
        self.billing_address = self.billing_address.strip()
        super().save(*args, **kwargs)


class Vehicle(SoftDeleteMixin, TimeStampedModel):
    business = models.ForeignKey("core.BusinessAccount", related_name="vehicles", on_delete=models.PROTECT)
    customer = models.ForeignKey(Customer, related_name="vehicles", on_delete=models.PROTECT)
    license_plate = models.CharField(max_length=20, blank=True)
    brand = models.CharField(max_length=80, blank=True)
    model = models.CharField(max_length=80, blank=True)
    color = models.CharField(max_length=60, blank=True)
    vehicle_type = models.CharField(
        max_length=20,
        choices=VehicleType.choices,
        default=VehicleType.AUTO,
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["license_plate"]
        verbose_name = "vehículo"
        verbose_name_plural = "vehículos"
        indexes = [
            models.Index(fields=["business", "license_plate"], name="vehicle_biz_lp_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "license_plate"],
                condition=~models.Q(license_plate="") & models.Q(deleted_at__isnull=True),
                name="unique_vehicle_license_plate_per_business_when_present",
            ),
        ]

    def __str__(self):
        details = " ".join(part for part in [self.brand, self.model] if part).strip()
        if self.license_plate and details:
            return f"{self.license_plate} - {details}"
        return self.license_plate or details or "Sin patente"

    def save(self, *args, **kwargs):
        self.license_plate = self.license_plate.strip().upper()
        if self.customer_id and not self.business_id:
            self.business = self.customer.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])
