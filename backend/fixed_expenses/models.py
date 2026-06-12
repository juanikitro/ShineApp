from django.core.exceptions import ObjectDoesNotExist
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone

from core.soft_delete import SoftDeleteMixin


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Efectivo"
    CARD = "card", "Tarjeta"
    TRANSFER = "transfer", "Transferencia"
    OTHER = "other", "Otro"


class FixedExpense(SoftDeleteMixin):
    """Plantilla de gasto fijo recurrente (servicios, alquiler, expensas)."""

    class IntervalUnit(models.TextChoices):
        WEEKS = "weeks", "Semanas"
        MONTHS = "months", "Meses"

    business = models.ForeignKey(
        "core.BusinessAccount", related_name="fixed_expenses", on_delete=models.PROTECT
    )
    concept = models.CharField(max_length=160)
    supplier = models.ForeignKey(
        "inventory.Supplier",
        related_name="fixed_expenses",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_category = models.CharField(max_length=80, default="Servicios")
    expense_subcategory = models.CharField(max_length=80, default="Otros", blank=True)
    notes = models.TextField(blank=True)
    interval_unit = models.CharField(
        max_length=10, choices=IntervalUnit.choices, default=IntervalUnit.MONTHS
    )
    interval_count = models.PositiveIntegerField(default=1)
    start_date = models.DateField(default=timezone.localdate)
    due_offset_days = models.PositiveIntegerField(default=0)
    end_date = models.DateField(null=True, blank=True)
    max_cycles = models.PositiveIntegerField(null=True, blank=True)
    cycles_generated = models.PositiveIntegerField(default=0)
    last_generated_for = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    auto_pay = models.BooleanField(default=False)
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.TRANSFER
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["-is_active", "concept", "-id"]

    def __str__(self):
        return f"{self.concept} (cada {self.interval_count} {self.interval_unit})"

    def save(self, *args, **kwargs):
        if not self.business_id and self.supplier_id:
            self.business = self.supplier.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])
        # las ocurrencias pendientes (sin pagar) dejan de adeudarse; las pagadas
        # quedan como egresos historicos
        self.occurrences.filter(status="pending").delete()

    def restore(self):
        with transaction.atomic():
            now = timezone.now()
            FixedExpense.all_objects.filter(pk=self.pk).update(
                is_active=True, deleted_at=None, updated_at=now,
            )
            self.is_active = True
            self.deleted_at = None
            self.updated_at = now
            for occurrence in self.occurrences(manager="all_objects").filter(
                deleted_at__isnull=False, status="pending"
            ):
                occurrence.restore()


class FixedExpenseOccurrence(SoftDeleteMixin):
    """Ocurrencia por periodo generada desde una plantilla de gasto fijo."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        PAID = "paid", "Pagada"

    business = models.ForeignKey(
        "core.BusinessAccount",
        related_name="fixed_expense_occurrences",
        on_delete=models.PROTECT,
    )
    fixed_expense = models.ForeignKey(
        FixedExpense, related_name="occurrences", on_delete=models.PROTECT
    )
    period_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_category = models.CharField(max_length=80, default="Servicios")
    expense_subcategory = models.CharField(max_length=80, default="Otros", blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    cash_movement = models.OneToOneField(
        "finance.CashMovement",
        related_name="fixed_expense_occurrence",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.TRANSFER
    )
    paid_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["-period_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["fixed_expense", "period_date"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_fixed_expense_period",
            ),
        ]

    def __str__(self):
        return f"{self.fixed_expense_id} - {self.period_date}"

    def save(self, *args, **kwargs):
        if not self.business_id and self.fixed_expense_id:
            self.business = self.fixed_expense.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        with transaction.atomic():
            try:
                movement = self.cash_movement
            except ObjectDoesNotExist:
                movement = None
            if self.cash_movement_id:
                FixedExpenseOccurrence.all_objects.filter(pk=self.pk).update(cash_movement=None)
                self.cash_movement = None
            if movement is not None:
                movement.delete()
            self.deleted_at = timezone.now()
            self.save(update_fields=["deleted_at", "updated_at"])

    def restore(self):
        # No se reactiva el `cash_movement` original (la cascada de delete corta
        # el link). El movimiento de caja queda disponible en la papelera para
        # que el usuario lo recupere por separado si lo necesita.
        with transaction.atomic():
            now = timezone.now()
            FixedExpenseOccurrence.all_objects.filter(pk=self.pk).update(
                deleted_at=None, updated_at=now,
            )
            self.deleted_at = None
            self.updated_at = now
