from decimal import Decimal

from django.db import models
from django.db.models import Sum
from django.utils import timezone


class RecurringDebt(models.Model):
    class IntervalUnit(models.TextChoices):
        DAYS = "days", "Dias"
        WEEKS = "weeks", "Semanas"
        MONTHS = "months", "Meses"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Efectivo"
        CARD = "card", "Tarjeta"
        TRANSFER = "transfer", "Transferencia"
        OTHER = "other", "Otro"

    business = models.ForeignKey(
        "core.BusinessAccount", related_name="recurring_debts", on_delete=models.PROTECT
    )
    concept = models.CharField(max_length=160)
    creditor = models.CharField(max_length=140, blank=True)
    supplier = models.ForeignKey(
        "inventory.Supplier",
        related_name="recurring_debts",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
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
    auto_settle = models.BooleanField(default=False)
    auto_settle_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
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


class Debt(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        PARTIAL = "partial", "Parcial"
        PAID = "paid", "Pagada"
        OVERDUE = "overdue", "Vencida"

    business = models.ForeignKey("core.BusinessAccount", related_name="debts", on_delete=models.PROTECT)
    concept = models.CharField(max_length=160)
    creditor = models.CharField(max_length=140, blank=True)
    supplier = models.ForeignKey(
        "inventory.Supplier",
        related_name="debts",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    origin_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(null=True, blank=True)
    expense_category = models.CharField(max_length=80, default="Servicios")
    expense_subcategory = models.CharField(max_length=80, default="Otros", blank=True)
    notes = models.TextField(blank=True)
    cash_movement = models.OneToOneField(
        "finance.CashMovement",
        related_name="debt",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    recurring_source = models.ForeignKey(
        RecurringDebt,
        related_name="generated_debts",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-origin_date", "-id"]

    def __str__(self):
        return self.concept

    def save(self, *args, **kwargs):
        if not self.business_id:
            if self.supplier_id:
                self.business = self.supplier.business
            elif self.cash_movement_id:
                self.business = self.cash_movement.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)

    @property
    def total_paid(self):
        return self.payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

    @property
    def balance_due(self):
        return max(self.principal_amount - self.total_paid, Decimal("0.00"))

    @property
    def status(self):
        if self.balance_due <= 0:
            return self.Status.PAID
        if self.due_date and self.due_date < timezone.localdate():
            return self.Status.OVERDUE
        if self.total_paid > 0:
            return self.Status.PARTIAL
        return self.Status.PENDING


class DebtPayment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Efectivo"
        CARD = "card", "Tarjeta"
        TRANSFER = "transfer", "Transferencia"
        OTHER = "other", "Otro"

    business = models.ForeignKey("core.BusinessAccount", related_name="debt_payments", on_delete=models.PROTECT)
    debt = models.ForeignKey(Debt, related_name="payments", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_at = models.DateField(default=timezone.localdate)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_at", "-id"]

    def __str__(self):
        return f"{self.debt_id} - {self.amount}"

    def save(self, *args, **kwargs):
        if self.debt_id and not self.business_id:
            self.business = self.debt.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)
