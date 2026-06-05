from datetime import datetime, time
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from core.models import register_expense_classification
from core.serializers import BusinessScopedSerializerMixin
from finance.cash import cash_day, ensure_cash_day_open, request_user_from_context
from finance.models import CashMovement

from .models import Debt, DebtPayment, RecurringDebt


def debt_origin_datetime(debt):
    return timezone.make_aware(datetime.combine(debt.origin_date, time.min))


def sync_debt_cash_movement(debt, user=None):
    defaults = {
        "business": debt.business,
        "movement_type": CashMovement.MovementType.EXPENSE,
        "category": debt.expense_category or "Servicios",
        "subcategory": debt.expense_subcategory or "Otros",
        "amount": debt.principal_amount,
        "occurred_at": debt_origin_datetime(debt),
        "description": f"Deuda por {debt.concept}",
    }
    if debt.cash_movement_id:
        CashMovement.objects.filter(pk=debt.cash_movement_id).update(**defaults)
        register_expense_classification(defaults["category"], defaults["subcategory"], business=debt.business)
        return debt.cash_movement

    movement = CashMovement.objects.create(**defaults, created_by=user)
    register_expense_classification(defaults["category"], defaults["subcategory"], business=debt.business)
    debt.cash_movement = movement
    debt.save(update_fields=["cash_movement", "updated_at"])
    return movement


class DebtPaymentSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    debt_concept = serializers.CharField(source="debt.concept", read_only=True)
    debt_balance_due = serializers.SerializerMethodField()

    class Meta:
        model = DebtPayment
        fields = [
            "id",
            "debt",
            "debt_concept",
            "amount",
            "paid_at",
            "method",
            "notes",
            "debt_balance_due",
            "created_at",
        ]
        read_only_fields = ["id", "debt_concept", "debt_balance_due", "created_at"]

    def get_debt_balance_due(self, obj):
        return obj.debt.balance_due

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El importe debe ser mayor a cero.")
        return value

    def validate(self, attrs):
        debt = attrs.get("debt") or getattr(self.instance, "debt", None)
        amount = attrs.get("amount") or getattr(self.instance, "amount", Decimal("0.00"))
        paid_at = attrs.get("paid_at", getattr(self.instance, "paid_at", timezone.localdate()))
        if self.instance:
            ensure_cash_day_open(self.instance.paid_at, field="paid_at", business=self.instance.business)
        ensure_cash_day_open(paid_at, field="paid_at", business=self.get_business() or getattr(debt, "business", None))
        if not debt:
            return attrs
        self.validate_same_business(debt)

        available = debt.balance_due
        if self.instance and self.instance.debt_id == debt.id:
            available += self.instance.amount
        if amount > available:
            raise serializers.ValidationError({"amount": "El pago no puede superar el saldo pendiente."})
        return attrs


class DebtSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)
    cash_movement = serializers.PrimaryKeyRelatedField(read_only=True)
    recurring_source = serializers.PrimaryKeyRelatedField(read_only=True)
    payments = DebtPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Debt
        fields = [
            "id",
            "concept",
            "creditor",
            "supplier",
            "supplier_name",
            "principal_amount",
            "origin_date",
            "due_date",
            "expense_category",
            "expense_subcategory",
            "total_paid",
            "balance_due",
            "status",
            "cash_movement",
            "recurring_source",
            "notes",
            "payments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "supplier_name",
            "total_paid",
            "balance_due",
            "status",
            "cash_movement",
            "recurring_source",
            "payments",
            "created_at",
            "updated_at",
        ]

    def validate_principal_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El importe de la deuda debe ser mayor a cero.")
        return value

    def validate_expense_category(self, value):
        category = str(value or "").strip()
        if not category:
            raise serializers.ValidationError("La categoria es obligatoria.")
        return category

    def validate_expense_subcategory(self, value):
        subcategory = str(value or "").strip()
        if not subcategory:
            raise serializers.ValidationError("La subcategoria es obligatoria.")
        return subcategory

    def validate(self, attrs):
        principal = attrs.get("principal_amount") or getattr(self.instance, "principal_amount", Decimal("0.00"))
        origin_date = attrs.get("origin_date", getattr(self.instance, "origin_date", timezone.localdate()))
        supplier = attrs.get("supplier", getattr(self.instance, "supplier", None))
        self.validate_same_business(supplier)
        if self.instance and self.instance.cash_movement_id:
            ensure_cash_day_open(
                cash_day(self.instance.cash_movement.occurred_at),
                field="origin_date",
                business=self.instance.business,
            )
        ensure_cash_day_open(origin_date, field="origin_date", business=self.get_business() or getattr(supplier, "business", None))
        if self.instance and principal < self.instance.total_paid:
            raise serializers.ValidationError(
                {"principal_amount": "El total de la deuda no puede ser menor a lo ya pagado."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        debt = Debt.objects.create(**validated_data)
        sync_debt_cash_movement(debt, user=request_user_from_context(self.context))
        return debt

    @transaction.atomic
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        sync_debt_cash_movement(instance)
        return instance


class RecurringDebtSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    next_occurrence = serializers.SerializerMethodField()

    class Meta:
        model = RecurringDebt
        fields = [
            "id",
            "concept",
            "creditor",
            "supplier",
            "supplier_name",
            "principal_amount",
            "expense_category",
            "expense_subcategory",
            "notes",
            "interval_unit",
            "interval_count",
            "start_date",
            "due_offset_days",
            "end_date",
            "max_cycles",
            "cycles_generated",
            "last_generated_for",
            "is_active",
            "auto_settle",
            "auto_settle_method",
            "next_occurrence",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "supplier_name",
            "cycles_generated",
            "last_generated_for",
            "next_occurrence",
            "created_at",
            "updated_at",
        ]

    def get_next_occurrence(self, obj):
        from .recurrence import next_occurrence

        result = next_occurrence(obj)
        return result.isoformat() if result else None

    def validate_principal_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto recurrente debe ser mayor a cero.")
        return value

    def validate_interval_count(self, value):
        if value < 1:
            raise serializers.ValidationError("El intervalo debe ser de al menos 1.")
        return value

    def validate_expense_category(self, value):
        category = str(value or "").strip()
        if not category:
            raise serializers.ValidationError("La categoria es obligatoria.")
        return category

    def validate_expense_subcategory(self, value):
        subcategory = str(value or "").strip()
        if not subcategory:
            raise serializers.ValidationError("La subcategoria es obligatoria.")
        return subcategory

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "La fecha de fin no puede ser anterior al inicio."}
            )
        max_cycles = attrs.get("max_cycles", getattr(self.instance, "max_cycles", None))
        if max_cycles is not None and max_cycles < 1:
            raise serializers.ValidationError(
                {"max_cycles": "La cantidad de ciclos debe ser mayor a cero."}
            )
        supplier = attrs.get("supplier", getattr(self.instance, "supplier", None))
        self.validate_same_business(supplier)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        return RecurringDebt.objects.create(**validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
