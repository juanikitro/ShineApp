from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import models, transaction
from django.utils import timezone

from core.models import default_expense_category_tree, default_income_category_tree
from core.soft_delete import SoftDeleteMixin


class Payment(SoftDeleteMixin):
    class PaymentType(models.TextChoices):
        DEPOSIT = "deposit", "Sena"
        PAYMENT = "payment", "Pago"

    class Method(models.TextChoices):
        CASH = "cash", "Efectivo"
        CARD = "card", "Tarjeta"
        TRANSFER = "transfer", "Transferencia"
        OTHER = "other", "Otro"

    business = models.ForeignKey("core.BusinessAccount", related_name="payments", on_delete=models.PROTECT)
    work_order = models.ForeignKey("workorders.WorkOrder", related_name="payments", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PaymentType.choices, default=PaymentType.PAYMENT)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    paid_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["-paid_at", "-id"]
        indexes = [
            models.Index(
                fields=["business", "-paid_at"],
                name="pay_biz_paid_at_idx",
            ),
        ]

    def __str__(self):
        return f"{self.work_order_id} - {self.amount}"

    def save(self, *args, **kwargs):
        if self.work_order_id and not self.business_id:
            self.business = self.work_order.business
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
            if movement is not None:
                movement.delete()
            self.deleted_at = timezone.now()
            self.save(update_fields=["deleted_at"])

    def restore(self):
        with transaction.atomic():
            Payment.all_objects.filter(pk=self.pk).update(deleted_at=None)
            self.deleted_at = None
            movement = (
                CashMovement.all_objects.filter(payment_id=self.pk, deleted_at__isnull=False).first()
            )
            if movement is not None:
                movement.restore()


class CashMovement(SoftDeleteMixin):
    class MovementType(models.TextChoices):
        INCOME = "income", "Ingreso"
        EXPENSE = "expense", "Egreso"

    INCOME_CATEGORIES = list(default_income_category_tree().keys())
    EXPENSE_CATEGORIES = list(default_expense_category_tree().keys())

    business = models.ForeignKey("core.BusinessAccount", related_name="cash_movements", on_delete=models.PROTECT)
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    category = models.CharField(max_length=80)
    subcategory = models.CharField(max_length=80, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    occurred_at = models.DateTimeField(default=timezone.now)
    description = models.TextField(blank=True)
    payment = models.OneToOneField(Payment, related_name="cash_movement", null=True, blank=True, on_delete=models.PROTECT)
    material_purchase = models.OneToOneField(
        "inventory.MaterialPurchase",
        related_name="cash_movement",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    stock_movement = models.OneToOneField(
        "inventory.StockMovement",
        related_name="cash_movement",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    adjusts_closed_day = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["-occurred_at", "-id"]
        indexes = [
            models.Index(
                fields=["business", "-occurred_at"],
                name="cm_biz_occurred_at_idx",
            ),
        ]

    def __str__(self):
        return f"{self.movement_type} {self.amount}"

    def save(self, *args, **kwargs):
        if not self.business_id:
            if self.payment_id:
                self.business = self.payment.business
            elif self.material_purchase_id:
                self.business = self.material_purchase.business
            elif self.stock_movement_id:
                self.business = self.stock_movement.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)

    @classmethod
    def category_options(cls):
        return {
            cls.MovementType.INCOME: cls.INCOME_CATEGORIES,
            cls.MovementType.EXPENSE: cls.EXPENSE_CATEGORIES,
        }


class CashClosure(models.Model):
    business = models.ForeignKey("core.BusinessAccount", related_name="cash_closures", on_delete=models.PROTECT)
    day = models.DateField()
    total_income = models.DecimalField(max_digits=12, decimal_places=2)
    total_expense = models.DecimalField(max_digits=12, decimal_places=2)
    balance = models.DecimalField(max_digits=12, decimal_places=2)
    cashflow_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cashflow_expense = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cashflow_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    closed_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-day"]
        constraints = [
            models.UniqueConstraint(fields=["business", "day"], name="unique_cash_closure_per_business_day"),
        ]

    def save(self, *args, **kwargs):
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)
