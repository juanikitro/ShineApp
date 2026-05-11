from decimal import Decimal

from django.db import models
from django.db.models import Sum
from django.utils import timezone


class WorkOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        CONFIRMED = "confirmed", "Confirmada"
        IN_PROGRESS = "in_progress", "En proceso"
        READY = "ready", "Listo"
        DELIVERED = "delivered", "Entregado"
        CANCELED = "canceled", "Cancelada"

    reservation = models.OneToOneField(
        "scheduling.Reservation",
        related_name="work_order",
        on_delete=models.CASCADE,
    )
    customer = models.ForeignKey("customers.Customer", related_name="work_orders", on_delete=models.PROTECT)
    vehicle = models.ForeignKey("customers.Vehicle", related_name="work_orders", on_delete=models.PROTECT)
    service = models.ForeignKey("catalog.Service", related_name="work_orders", on_delete=models.PROTECT)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    internal_notes = models.TextField(blank=True)
    received_at = models.DateTimeField(default=timezone.now)
    estimated_delivery_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Orden #{self.id or '-'} - {self.customer}"

    @property
    def status(self):
        if self.reservation_id:
            return self.reservation.status
        return getattr(self, "_status_override", self.Status.PENDING)

    @status.setter
    def status(self, value):
        self._status_override = value

    def save(self, *args, **kwargs):
        requested_status = getattr(self, "_status_override", None)
        if self.service_id and not self.total_amount:
            self.total_amount = self.service.base_price
        super().save(*args, **kwargs)
        if requested_status and self.reservation_id:
            from scheduling.models import Reservation

            Reservation.objects.filter(pk=self.reservation_id).update(
                status=requested_status,
                updated_at=timezone.now(),
            )
            if "reservation" in self._state.fields_cache:
                self.reservation.status = requested_status

    @property
    def paid_amount(self):
        return self.payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

    @property
    def balance_due(self):
        return max(self.total_amount - self.paid_amount, Decimal("0.00"))

    @property
    def material_cost(self):
        legacy_total = self.material_consumptions.aggregate(total=Sum("estimated_total_cost"))["total"] or Decimal("0.00")
        movement_total = (
            self.stock_movements.filter(
                movement_type="consumption",
            ).aggregate(total=Sum("lines__estimated_total_cost"))["total"]
            or Decimal("0.00")
        )
        return legacy_total + movement_total
