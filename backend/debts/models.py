from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist
from django.db import models, transaction
from django.db.models import Sum
from django.utils import timezone

from core.soft_delete import SoftDeleteMixin


class Debt(SoftDeleteMixin):
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["-origin_date", "-id"]
        verbose_name = "deuda"
        verbose_name_plural = "deudas"
        indexes = [
            models.Index(fields=["business", "-origin_date"], name="debt_biz_origin_idx"),
            models.Index(fields=["business", "due_date"], name="debt_biz_due_idx"),
        ]

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

    def delete(self, using=None, keep_parents=False):
        with transaction.atomic():
            try:
                movement = self.cash_movement
            except ObjectDoesNotExist:
                movement = None
            if self.cash_movement_id:
                Debt.all_objects.filter(pk=self.pk).update(cash_movement=None)
                self.cash_movement = None
            if movement is not None:
                movement.delete()
            self.deleted_at = timezone.now()
            self.save(update_fields=["deleted_at", "updated_at"])

    def restore(self):
        # No se reactiva el `cash_movement` original: la cascada de delete corta
        # el link `Debt.cash_movement` para evitar conflictos en re-creacion. Si
        # el usuario necesita el movimiento de caja vinculado, debe restaurarlo
        # desde la papelera por separado.
        with transaction.atomic():
            now = timezone.now()
            Debt.all_objects.filter(pk=self.pk).update(deleted_at=None, updated_at=now)
            self.deleted_at = None
            self.updated_at = now
            for payment in self.payments(manager="all_objects").filter(deleted_at__isnull=False):
                payment.restore()

    @property
    def total_paid(self):
        # Si el queryset anoto `total_paid_amount` (DebtViewSet / dashboard) se usa esa
        # lectura en memoria y se evita un aggregate por deuda (N+1). Fuera de ese
        # contexto (tests, admin, create) cae al aggregate normal.
        annotated = getattr(self, "total_paid_amount", None)
        if annotated is not None:
            return annotated
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


class DebtPayment(SoftDeleteMixin):
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

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["-paid_at", "-id"]
        verbose_name = "pago de deuda"
        verbose_name_plural = "pagos de deuda"
        indexes = [
            models.Index(fields=["business", "-paid_at"], name="debtpay_biz_paid_idx"),
        ]

    def __str__(self):
        return f"{self.debt_id} - {self.amount}"

    def save(self, *args, **kwargs):
        if self.debt_id and not self.business_id:
            self.business = self.debt.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)
