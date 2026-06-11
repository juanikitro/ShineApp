from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from core.serializers import BusinessScopedSerializerMixin

from .models import FixedExpense, FixedExpenseOccurrence


class FixedExpenseSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    next_occurrence = serializers.SerializerMethodField()

    class Meta:
        model = FixedExpense
        fields = [
            "id",
            "concept",
            "supplier",
            "supplier_name",
            "amount",
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
            "auto_pay",
            "payment_method",
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
        from .materialization import next_occurrence

        result = next_occurrence(obj)
        return result.isoformat() if result else None

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto del gasto fijo debe ser mayor a cero.")
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
    def update(self, instance, validated_data):
        from .materialization import sync_pending_occurrences

        instance = super().update(instance, validated_data)
        sync_pending_occurrences(instance)
        return instance


class PayOccurrenceInputSerializer(serializers.Serializer):
    """Input del action pay: todos los campos son opcionales.

    ``method`` usa CharField para mantener el comportamiento existente de
    fallback silencioso a ``occurrence.method`` cuando el valor es invalido o
    ausente (en lugar de rechazar con 400).
    ``amount`` usa DecimalField para normalizar a 2 decimales y rechazar
    valores no positivos antes de llegar a la capa de negocio.
    """

    method = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    paid_at = serializers.DateField(required=False, allow_null=True)
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=False,
        allow_null=True,
    )


class FixedExpenseOccurrenceSerializer(serializers.ModelSerializer):
    fixed_expense_concept = serializers.CharField(
        source="fixed_expense.concept", read_only=True
    )

    class Meta:
        model = FixedExpenseOccurrence
        fields = [
            "id",
            "fixed_expense",
            "fixed_expense_concept",
            "period_date",
            "due_date",
            "amount",
            "expense_category",
            "expense_subcategory",
            "status",
            "cash_movement",
            "method",
            "paid_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
