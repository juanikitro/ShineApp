
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from core.models import register_expense_classification, register_income_classification
from core.serializers import BusinessScopedSerializerMixin

from .cash import (
    cash_day,
    cash_movement_cashflow_effect,
    cash_movement_source_kind,
    ensure_adjustment_target_closed,
    ensure_cash_day_open,
    related_fixed_expense_occurrence,
    request_user_from_context,
    signed_amount_for,
)
from .models import CashClosure, CashMovement, Payment


class PaymentSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    work_order_label = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "work_order",
            "work_order_label",
            "amount",
            "payment_type",
            "method",
            "paid_at",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "work_order_label", "created_at"]
        extra_kwargs = {
            "amount": {"required": False},
        }

    def get_work_order_label(self, obj):
        return str(obj.work_order)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El importe debe ser mayor a cero.")
        return value

    def validate(self, attrs):
        work_order = attrs.get("work_order") or getattr(self.instance, "work_order", None)
        amount = attrs.get("amount", getattr(self.instance, "amount", None))
        paid_at = attrs.get("paid_at", getattr(self.instance, "paid_at", timezone.now()))
        business = getattr(work_order, "business", None) or self.get_business()
        if self.instance:
            ensure_cash_day_open(cash_day(self.instance.paid_at), field="paid_at", business=self.instance.business)
        ensure_cash_day_open(cash_day(paid_at), field="paid_at", business=business)
        self.validate_same_business(work_order)
        if work_order and amount is None:
            amount = work_order.balance_due
            attrs["amount"] = amount
        if amount is None:
            raise serializers.ValidationError({"amount": "Este campo es requerido."})
        if amount <= 0:
            raise serializers.ValidationError({"amount": "El importe debe ser mayor a cero."})
        if work_order and amount > work_order.balance_due:
            raise serializers.ValidationError({"amount": "El pago no puede superar la deuda pendiente."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        payment = Payment.objects.create(**validated_data)
        movement = CashMovement.objects.create(
            movement_type=CashMovement.MovementType.INCOME,
            category="Sena" if payment.payment_type == Payment.PaymentType.DEPOSIT else "Pago",
            subcategory=payment.get_method_display(),
            amount=payment.amount,
            occurred_at=payment.paid_at,
            description=f"Pago orden #{payment.work_order_id}",
            payment=payment,
            business=payment.business,
            created_by=request_user_from_context(self.context),
        )
        register_income_classification(movement.category, movement.subcategory, business=payment.business)
        return payment


class CashMovementSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    debt = serializers.SerializerMethodField()
    debt_concept = serializers.SerializerMethodField()
    source_kind = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()
    signed_amount = serializers.SerializerMethodField()
    cashflow_effect = serializers.SerializerMethodField()
    economic_effect = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    counterparty_kind = serializers.SerializerMethodField()
    counterparty_label = serializers.SerializerMethodField()
    reference_label = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()

    class Meta:
        model = CashMovement
        fields = [
            "id",
            "movement_type",
            "category",
            "subcategory",
            "amount",
            "occurred_at",
            "description",
            "payment",
            "material_purchase",
            "stock_movement",
            "debt",
            "debt_concept",
            "adjusts_closed_day",
            "source_kind",
            "source_label",
            "signed_amount",
            "cashflow_effect",
            "economic_effect",
            "counterparty_kind",
            "counterparty_label",
            "reference_label",
            "payment_method",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "payment",
            "material_purchase",
            "stock_movement",
            "debt",
            "debt_concept",
            "source_kind",
            "source_label",
            "signed_amount",
            "cashflow_effect",
            "economic_effect",
            "counterparty_kind",
            "counterparty_label",
            "reference_label",
            "payment_method",
            "created_by",
            "created_by_username",
            "created_at",
        ]

    def get_related_debt(self, obj):
        try:
            return obj.debt
        except ObjectDoesNotExist:
            return None

    def get_debt(self, obj):
        debt = self.get_related_debt(obj)
        return debt.id if debt else None

    def get_debt_concept(self, obj):
        debt = self.get_related_debt(obj)
        return debt.concept if debt else ""

    def get_source_kind(self, obj):
        return cash_movement_source_kind(obj)

    def get_source_label(self, obj):
        source_kind = cash_movement_source_kind(obj)
        if source_kind == "payment":
            return "Cobro de orden"
        if source_kind == "material_purchase":
            return "Compra de materiales"
        if source_kind == "stock_purchase":
            return "Compra de materiales"
        if source_kind == "stock_sale":
            return "Venta de materiales"
        if source_kind == "debt_origin":
            return "Deuda original"
        if source_kind == "adjustment":
            return f"Ajuste de cierre {obj.adjusts_closed_day.isoformat()}"
        if source_kind == "fixed_expense":
            return "Gasto fijo"
        return "Movimiento manual"

    def get_signed_amount(self, obj):
        return signed_amount_for(obj.movement_type, obj.amount)

    def get_cashflow_effect(self, obj):
        return cash_movement_cashflow_effect(obj)

    def get_economic_effect(self, obj):
        return True

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by_id else ""

    def _related_payment(self, obj):
        return getattr(obj, "payment", None) if obj.payment_id else None

    def _related_material_purchase(self, obj):
        return getattr(obj, "material_purchase", None) if obj.material_purchase_id else None

    def _related_stock_movement(self, obj):
        return getattr(obj, "stock_movement", None) if obj.stock_movement_id else None

    def get_counterparty_kind(self, obj):
        source_kind = cash_movement_source_kind(obj)
        if source_kind == "payment":
            return "customer"
        if source_kind in {"stock_purchase", "material_purchase"}:
            return "supplier"
        if source_kind == "stock_sale":
            return "customer"
        if source_kind in {"debt_origin", "debt_payment"}:
            return "creditor"
        if source_kind == "adjustment":
            return "internal"
        return "none"

    def get_counterparty_label(self, obj):
        source_kind = cash_movement_source_kind(obj)
        if source_kind == "payment":
            payment = self._related_payment(obj)
            customer = getattr(getattr(payment, "work_order", None), "customer", None)
            return getattr(customer, "name", "") or ""
        if source_kind == "stock_purchase":
            movement = self._related_stock_movement(obj)
            supplier = getattr(movement, "supplier", None)
            return getattr(supplier, "name", "") or ""
        if source_kind == "stock_sale":
            movement = self._related_stock_movement(obj)
            customer = getattr(movement, "customer", None)
            return getattr(customer, "name", "") or ""
        if source_kind == "material_purchase":
            return ""
        if source_kind == "debt_origin":
            debt = self.get_related_debt(obj)
            if not debt:
                return ""
            creditor = (debt.creditor or "").strip()
            if creditor:
                return creditor
            supplier = getattr(debt, "supplier", None)
            return getattr(supplier, "name", "") or ""
        return ""

    def get_reference_label(self, obj):
        source_kind = cash_movement_source_kind(obj)
        if source_kind == "payment":
            payment = self._related_payment(obj)
            work_order_id = getattr(payment, "work_order_id", None)
            return f"Orden #{work_order_id}" if work_order_id else ""
        if source_kind == "material_purchase":
            purchase = self._related_material_purchase(obj)
            material = getattr(purchase, "material", None)
            material_name = getattr(material, "name", "") or ""
            return material_name
        if source_kind in {"stock_purchase", "stock_sale"}:
            movement = self._related_stock_movement(obj)
            number = (getattr(movement, "document_number", "") or "").strip()
            if number:
                return number
            return f"Movimiento #{getattr(movement, 'id', '')}" if movement else ""
        if source_kind == "debt_origin":
            debt = self.get_related_debt(obj)
            return debt.concept if debt else ""
        if source_kind == "adjustment":
            target = obj.adjusts_closed_day
            return f"Ajuste cierre {target.isoformat()}" if target else "Ajuste"
        if source_kind == "fixed_expense":
            occurrence = related_fixed_expense_occurrence(obj)
            name = getattr(getattr(occurrence, "fixed_expense", None), "name", "") or ""
            return name
        return ""

    def get_payment_method(self, obj):
        source_kind = cash_movement_source_kind(obj)
        if source_kind == "payment":
            payment = self._related_payment(obj)
            method = getattr(payment, "get_method_display", None)
            return method() if callable(method) else ""
        if source_kind in {"stock_purchase", "stock_sale"}:
            movement = self._related_stock_movement(obj)
            method = getattr(movement, "get_payment_method_display", None)
            return method() if callable(method) else ""
        return ""

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El importe debe ser mayor a cero.")
        return value

    def validate(self, attrs):
        occurred_at = attrs.get("occurred_at", getattr(self.instance, "occurred_at", timezone.now()))
        adjusts_closed_day = attrs.get("adjusts_closed_day", getattr(self.instance, "adjusts_closed_day", None))
        business = self.get_business() or getattr(self.instance, "business", None)
        if self.instance:
            ensure_cash_day_open(cash_day(self.instance.occurred_at), field="occurred_at", business=self.instance.business)
        ensure_cash_day_open(cash_day(occurred_at), field="occurred_at", business=business)
        ensure_adjustment_target_closed(adjusts_closed_day, business=business)
        return attrs

    def create(self, validated_data):
        movement = CashMovement.objects.create(
            **validated_data,
            created_by=request_user_from_context(self.context),
        )
        if movement.movement_type == CashMovement.MovementType.INCOME:
            register_income_classification(movement.category, movement.subcategory, business=movement.business)
        if movement.movement_type == CashMovement.MovementType.EXPENSE:
            register_expense_classification(movement.category, movement.subcategory, business=movement.business)
        return movement

    def update(self, instance, validated_data):
        movement = super().update(instance, validated_data)
        if movement.movement_type == CashMovement.MovementType.INCOME:
            register_income_classification(movement.category, movement.subcategory, business=movement.business)
        if movement.movement_type == CashMovement.MovementType.EXPENSE:
            register_expense_classification(movement.category, movement.subcategory, business=movement.business)
        return movement


class CashClosureSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = CashClosure
        fields = [
            "id",
            "day",
            "total_income",
            "total_expense",
            "balance",
            "cashflow_income",
            "cashflow_expense",
            "cashflow_balance",
            "closed_by",
            "closed_at",
            "notes",
        ]
        read_only_fields = ["id", "closed_by", "closed_at"]
