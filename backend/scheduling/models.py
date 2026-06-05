from decimal import Decimal

from django.conf import settings
from django.db import models


WASH_BUCKET = "wash"
DETAILING_BUCKET = "detailing"


def bucket_for_service_type(service_type):
    return DETAILING_BUCKET if service_type == "detailing" else WASH_BUCKET


class DailyCapacity(models.Model):
    business = models.ForeignKey("core.BusinessAccount", related_name="daily_capacities", on_delete=models.PROTECT)
    day = models.DateField()
    max_slots_wash = models.PositiveIntegerField(default=settings.DEFAULT_DAILY_CAPACITY)
    max_slots_detailing = models.PositiveIntegerField(default=settings.DEFAULT_DAILY_CAPACITY)
    notes = models.CharField(max_length=180, blank=True)

    class Meta:
        ordering = ["-day"]
        constraints = [
            models.UniqueConstraint(fields=["business", "day"], name="unique_daily_capacity_per_business_day"),
        ]

    def __str__(self):
        return f"{self.day}: lavado {self.max_slots_wash} / detailing {self.max_slots_detailing}"

    def slots_for_bucket(self, bucket):
        if bucket == DETAILING_BUCKET:
            return self.max_slots_detailing
        return self.max_slots_wash

    def save(self, *args, **kwargs):
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)


class Reservation(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        CONFIRMED = "confirmed", "Confirmada"
        IN_PROGRESS = "in_progress", "En proceso"
        READY = "ready", "Listo"
        DELIVERED = "delivered", "Entregado"
        CANCELED = "canceled", "Cancelada"

    business = models.ForeignKey("core.BusinessAccount", related_name="reservations", on_delete=models.PROTECT)
    customer = models.ForeignKey("customers.Customer", related_name="reservations", on_delete=models.PROTECT)
    vehicle = models.ForeignKey("customers.Vehicle", related_name="reservations", on_delete=models.PROTECT)
    service = models.ForeignKey("catalog.Service", related_name="reservations", on_delete=models.PROTECT)
    day = models.DateField()
    exit_day = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    exit_time = models.TimeField(null=True, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField(default=60)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["day", "start_time", "id"]

    def __str__(self):
        return f"{self.day} - {self.customer} - {self.service}"

    def save(self, *args, **kwargs):
        if self.customer_id and not self.business_id:
            self.business = self.customer.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)
        if getattr(self, "_skip_work_order_sync", False):
            return
        from .services import ensure_reservation_work_order

        ensure_reservation_work_order(self)

    @property
    def service_items(self):
        prefetched = getattr(self, "_prefetched_objects_cache", {}).get("items")
        items = (
            list(prefetched)
            if prefetched is not None
            else list(self.items.select_related("service").all())
        )
        if items:
            return items
        unit_price = self.service.price_for(self.vehicle.vehicle_type)
        return [
            ReservationItem(
                reservation=self,
                service=self.service,
                description=self.service.name,
                quantity=Decimal("1.00"),
                unit_price=unit_price,
                line_total=unit_price,
            )
        ]

    @property
    def services_total(self):
        return sum((item.line_total for item in self.service_items), Decimal("0.00"))

    @property
    def service_names_display(self):
        names = [item.description or item.service.name for item in self.service_items if item.service_id]
        return ", ".join(names) if names else self.service.name

    @classmethod
    def active_statuses(cls):
        return [
            cls.Status.PENDING,
            cls.Status.CONFIRMED,
            cls.Status.IN_PROGRESS,
            cls.Status.READY,
            cls.Status.DELIVERED,
        ]

    @classmethod
    def capacity_for_day(cls, day, business=None, bucket=WASH_BUCKET):
        queryset = DailyCapacity.objects.filter(day=day)
        if business is not None:
            queryset = queryset.filter(business=business)
        capacity = queryset.first()
        if capacity:
            return capacity.slots_for_bucket(bucket)
        return settings.DEFAULT_DAILY_CAPACITY

    @classmethod
    def used_slots_for_day(cls, day, exclude_id=None, business=None, bucket=None):
        queryset = cls.objects.filter(day=day, status__in=cls.active_statuses())
        if business is not None:
            queryset = queryset.filter(business=business)
        if bucket == DETAILING_BUCKET:
            queryset = queryset.filter(service__service_type="detailing")
        elif bucket == WASH_BUCKET:
            queryset = queryset.exclude(service__service_type="detailing")
        if exclude_id:
            queryset = queryset.exclude(pk=exclude_id)
        return queryset.count()

    @classmethod
    def bucket_for_service(cls, service):
        return bucket_for_service_type(getattr(service, "service_type", None))


class ReservationItem(models.Model):
    reservation = models.ForeignKey(Reservation, related_name="items", on_delete=models.CASCADE)
    service = models.ForeignKey("catalog.Service", null=True, blank=True, on_delete=models.SET_NULL)
    description = models.CharField(max_length=180)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
