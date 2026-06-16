from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import models, transaction
from django.utils import timezone

from core.soft_delete import SoftDeleteMixin


class Reservation(SoftDeleteMixin):
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
    sector = models.ForeignKey(
        "catalog.Sector",
        related_name="reservations",
        on_delete=models.PROTECT,
    )
    day = models.DateField()
    exit_day = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    exit_time = models.TimeField(null=True, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField(default=60)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["day", "start_time", "id"]
        verbose_name = "reserva"
        verbose_name_plural = "reservas"
        indexes = [
            models.Index(
                fields=["business", "day", "status"],
                name="resv_biz_day_status_idx",
            ),
        ]

    def __str__(self):
        return f"{self.day} - {self.customer} - {self.service}"

    def save(self, *args, **kwargs):
        if self.customer_id and not self.business_id:
            self.business = self.customer.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        if self.service_id and not self.sector_id:
            self.sector_id = self.service.sector_id
        super().save(*args, **kwargs)
        if getattr(self, "_skip_work_order_sync", False):
            return
        from .services import ensure_reservation_work_order

        ensure_reservation_work_order(self)

    def delete(self, using=None, keep_parents=False):
        with transaction.atomic():
            try:
                work_order = self.work_order
            except ObjectDoesNotExist:
                work_order = None
            if work_order is not None:
                work_order.delete()
            for item in list(self.items.all()):
                item.delete()
            self._skip_work_order_sync = True
            self.deleted_at = timezone.now()
            self.save(update_fields=["deleted_at", "updated_at"])

    def restore(self):
        with transaction.atomic():
            now = timezone.now()
            Reservation.all_objects.filter(pk=self.pk).update(deleted_at=None, updated_at=now)
            self.deleted_at = None
            self.updated_at = now
            for item in self.items(manager="all_objects").filter(deleted_at__isnull=False):
                item.restore()
            from workorders.models import WorkOrder

            work_order = (
                WorkOrder.all_objects.filter(reservation_id=self.pk, deleted_at__isnull=False).first()
            )
            if work_order is not None:
                work_order.restore()

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

    FLOW_ORDER = [
        Status.PENDING,
        Status.CONFIRMED,
        Status.IN_PROGRESS,
        Status.READY,
        Status.DELIVERED,
    ]

    REQUIRED_STATUSES = {Status.CONFIRMED, Status.DELIVERED}

    OPTIONAL_FLAG_BY_STATUS = {
        Status.PENDING: "reservation_use_pending",
        Status.IN_PROGRESS: "reservation_use_in_progress",
        Status.READY: "reservation_use_ready",
    }

    @classmethod
    def status_is_enabled(cls, status, profile):
        if status == cls.Status.CANCELED:
            return bool(getattr(profile, "reservation_use_canceled", True))
        if status in cls.REQUIRED_STATUSES:
            return True
        flag = cls.OPTIONAL_FLAG_BY_STATUS.get(status)
        if not flag:
            return True
        return bool(getattr(profile, flag, True))

    @classmethod
    def enabled_flow_statuses(cls, profile):
        return [status for status in cls.FLOW_ORDER if cls.status_is_enabled(status, profile)]

    @classmethod
    def initial_status_for_profile(cls, profile):
        if cls.status_is_enabled(cls.Status.PENDING, profile):
            return cls.Status.PENDING
        return cls.Status.CONFIRMED

    @classmethod
    def next_active_status(cls, current_status, profile):
        if current_status == cls.Status.CANCELED:
            return cls.initial_status_for_profile(profile)
        flow = cls.enabled_flow_statuses(profile)
        if current_status not in cls.FLOW_ORDER:
            return current_status
        try:
            current_index = cls.FLOW_ORDER.index(current_status)
        except ValueError:
            return current_status
        for status in cls.FLOW_ORDER[current_index + 1 :]:
            if status in flow:
                return status
        return cls.Status.DELIVERED

    @classmethod
    def normalize_status_for_profile(cls, status, profile):
        if status == cls.Status.CANCELED:
            return cls.Status.CANCELED if cls.status_is_enabled(status, profile) else None
        if cls.status_is_enabled(status, profile):
            return status
        flow = cls.enabled_flow_statuses(profile)
        if status not in cls.FLOW_ORDER:
            return status
        index = cls.FLOW_ORDER.index(status)
        for candidate in cls.FLOW_ORDER[index + 1 :]:
            if candidate in flow:
                return candidate
        for candidate in reversed(cls.FLOW_ORDER[:index]):
            if candidate in flow:
                return candidate
        return cls.Status.DELIVERED

    @classmethod
    def capacity_for_day(cls, day, business=None, sector=None):
        if sector is not None:
            if sector.default_capacity is not None:
                return sector.default_capacity
        return settings.DEFAULT_DAILY_CAPACITY

    @classmethod
    def used_slots_for_day(cls, day, exclude_id=None, business=None, sector=None):
        queryset = cls.objects.filter(day=day, status__in=cls.active_statuses())
        if business is not None:
            queryset = queryset.filter(business=business)
        if sector is not None:
            queryset = queryset.filter(sector=sector)
        if exclude_id:
            queryset = queryset.exclude(pk=exclude_id)
        return queryset.count()


class ReservationItem(SoftDeleteMixin):
    reservation = models.ForeignKey(Reservation, related_name="items", on_delete=models.CASCADE)
    service = models.ForeignKey("catalog.Service", null=True, blank=True, on_delete=models.SET_NULL)
    description = models.CharField(max_length=180)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["id"]
        verbose_name = "ítem de reserva"
        verbose_name_plural = "ítems de reserva"

    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
