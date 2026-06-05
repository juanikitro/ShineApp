from dataclasses import asdict

from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.audit import AuditedModelViewSetMixin
from core.permissions import CanViewEconomy
from finance.cash import cash_day, ensure_cash_day_open, request_user_from_context

from .models import Debt, DebtPayment, RecurringDebt
from .recurrence import apply_template_to_current, current_cycle_debt, materialize_due
from .serializers import (
    DebtPaymentSerializer,
    DebtSerializer,
    RecurringDebtSerializer,
)


class DebtViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("cash_movement", "category_suggestions")
    queryset = Debt.objects.select_related(
        "cash_movement", "supplier", "recurring_source"
    ).prefetch_related("payments").all()
    serializer_class = DebtSerializer
    permission_classes = [CanViewEconomy]

    def list(self, request, *args, **kwargs):
        skipped = materialize_due(
            business=self.get_business(),
            user=request.user if request.user.is_authenticated else None,
        )
        response = super().list(request, *args, **kwargs)
        if not skipped:
            return response
        skipped_payload = [
            {
                "plan_id": item.plan_id,
                "plan_concept": item.plan_concept,
                "period_date": item.period_date.isoformat(),
                "reason": item.reason,
            }
            for item in skipped
        ]
        payload = response.data
        if isinstance(payload, dict):
            payload["skipped_recurring_periods"] = skipped_payload
            response.data = payload
        else:
            response.data = {
                "results": payload,
                "skipped_recurring_periods": skipped_payload,
            }
        return response

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.payments.exists():
            raise serializers.ValidationError("No se puede eliminar una deuda con pagos registrados.")
        movement = instance.cash_movement
        if movement:
            ensure_cash_day_open(cash_day(movement.occurred_at), field="origin_date")
        instance.cash_movement = None
        instance.save(update_fields=["cash_movement", "updated_at"])
        instance.delete()
        if movement:
            movement.delete()


class DebtPaymentViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = DebtPayment.objects.select_related("debt").all()
    serializer_class = DebtPaymentSerializer
    permission_classes = [CanViewEconomy]

    def perform_destroy(self, instance):
        ensure_cash_day_open(instance.paid_at, field="paid_at")
        super().perform_destroy(instance)


class RecurringDebtViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RecurringDebt.objects.select_related("supplier").all()
    serializer_class = RecurringDebtSerializer
    permission_classes = [CanViewEconomy]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        instance.delete()

    @action(detail=True, methods=["post"], url_path="pause")
    def pause(self, request, pk=None):
        plan = self.get_object()
        plan.is_active = False
        plan.save(update_fields=["is_active", "updated_at"])
        serializer = self.get_serializer(plan)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="resume")
    def resume(self, request, pk=None):
        plan = self.get_object()
        plan.is_active = True
        plan.save(update_fields=["is_active", "updated_at"])
        serializer = self.get_serializer(plan)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="apply-to-current")
    def apply_to_current(self, request, pk=None):
        plan = self.get_object()
        debt = apply_template_to_current(plan)
        if debt is None:
            return Response(
                {"detail": "No hay deuda del ciclo actual disponible para actualizar."},
                status=400,
            )
        return Response(DebtSerializer(debt, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["get"], url_path="current-cycle")
    def current_cycle(self, request, pk=None):
        plan = self.get_object()
        debt = current_cycle_debt(plan)
        if debt is None:
            return Response({"detail": "Sin deuda generada para el ciclo actual."}, status=404)
        return Response(DebtSerializer(debt, context=self.get_serializer_context()).data)
