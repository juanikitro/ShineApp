from decimal import Decimal

from django.db import transaction
from django.db.models import DecimalField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import serializers, viewsets

from core.audit import AuditedModelViewSetMixin
from core.permissions import CanViewEconomy
from finance.cash import cash_day, ensure_cash_day_open

from .models import Debt, DebtPayment
from .serializers import (
    DebtPaymentSerializer,
    DebtSerializer,
)

ZERO = Decimal("0.00")
MONEY = DecimalField(max_digits=12, decimal_places=2)


class DebtViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("cash_movement", "category_suggestions")
    queryset = (
        Debt.objects.select_related("cash_movement", "supplier")
        .prefetch_related("payments")
        .annotate(
            # total_paid_amount lo lee Debt.total_paid (y de ahi balance_due/status)
            # sin un aggregate por deuda. filter= replica la semantica soft-delete del
            # related manager `payments` (excluye pagos borrados logicamente).
            total_paid_amount=Coalesce(
                Sum("payments__amount", filter=Q(payments__deleted_at__isnull=True)),
                Value(ZERO),
                output_field=MONEY,
            )
        )
    )
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
    queryset = (
        DebtPayment.objects.select_related("debt")
        .annotate(
            # debt_total_paid (suma de pagos vivos de la deuda) deja a
            # DebtPaymentSerializer.get_debt_balance_due calcular el saldo sin un
            # aggregate por pago en el listado.
            debt_total_paid=Coalesce(
                Subquery(
                    DebtPayment.objects.filter(debt_id=OuterRef("debt_id"))
                    .values("debt_id")
                    .annotate(total=Sum("amount"))
                    .values("total")
                ),
                Value(ZERO),
                output_field=MONEY,
            )
        )
    )
    serializer_class = DebtPaymentSerializer
    permission_classes = [CanViewEconomy]

    def perform_destroy(self, instance):
        ensure_cash_day_open(instance.paid_at, field="paid_at", business=instance.business)
        super().perform_destroy(instance)
