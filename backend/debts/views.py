from django.db import transaction
from rest_framework import serializers, viewsets

from core.audit import AuditedModelViewSetMixin
from core.permissions import CanViewEconomy
from finance.cash import cash_day, ensure_cash_day_open

from .models import Debt, DebtPayment
from .serializers import (
    DebtPaymentSerializer,
    DebtSerializer,
)


class DebtViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("cash_movement", "category_suggestions")
    queryset = Debt.objects.select_related(
        "cash_movement", "supplier"
    ).prefetch_related("payments").all()
    serializer_class = DebtSerializer
    permission_classes = [CanViewEconomy]

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.payments.exists():
            raise serializers.ValidationError("No se puede eliminar una deuda con pagos registrados.")
        movement = instance.cash_movement
        if movement:
            ensure_cash_day_open(
                cash_day(movement.occurred_at),
                field="origin_date",
                business=instance.business,
            )
        instance.delete()


class DebtPaymentViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = DebtPayment.objects.select_related("debt").all()
    serializer_class = DebtPaymentSerializer
    permission_classes = [CanViewEconomy]

    def perform_destroy(self, instance):
        ensure_cash_day_open(instance.paid_at, field="paid_at", business=instance.business)
        super().perform_destroy(instance)
