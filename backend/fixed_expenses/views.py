from datetime import date

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.audit import AuditedModelViewSetMixin
from core.permissions import CanViewEconomy

from .materialization import materialize_due, register_occurrence_payment
from .models import FixedExpense, FixedExpenseOccurrence, PaymentMethod
from .serializers import FixedExpenseOccurrenceSerializer, FixedExpenseSerializer


VALID_METHODS = set(PaymentMethod.values)


def _materialize_for(view, request):
    materialize_due(
        business=view.get_business(),
        user=request.user if request.user.is_authenticated else None,
    )


class FixedExpenseViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = FixedExpense.objects.select_related("supplier").all()
    serializer_class = FixedExpenseSerializer
    permission_classes = [CanViewEconomy]

    def list(self, request, *args, **kwargs):
        _materialize_for(self, request)
        return super().list(request, *args, **kwargs)

    def perform_destroy(self, instance):
        instance.delete()

    @action(detail=True, methods=["post"], url_path="pause")
    def pause(self, request, pk=None):
        plan = self.get_object()
        plan.is_active = False
        plan.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="resume")
    def resume(self, request, pk=None):
        plan = self.get_object()
        plan.is_active = True
        plan.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(plan).data)


class FixedExpenseOccurrenceViewSet(AuditedModelViewSetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = FixedExpenseOccurrence.objects.select_related(
        "fixed_expense", "cash_movement"
    ).all()
    serializer_class = FixedExpenseOccurrenceSerializer
    permission_classes = [CanViewEconomy]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        fixed_expense = self.request.query_params.get("fixed_expense")
        if fixed_expense:
            queryset = queryset.filter(fixed_expense_id=fixed_expense)
        return queryset

    def list(self, request, *args, **kwargs):
        _materialize_for(self, request)
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="pay")
    def pay(self, request, pk=None):
        occurrence = self.get_object()
        method = request.data.get("method")
        if method not in VALID_METHODS:
            method = occurrence.method
        paid_at_raw = request.data.get("paid_at")
        paid_at = None
        if paid_at_raw:
            try:
                paid_at = date.fromisoformat(str(paid_at_raw))
            except ValueError:
                return Response({"paid_at": "Fecha invalida."}, status=400)
        register_occurrence_payment(
            occurrence,
            user=request.user if request.user.is_authenticated else None,
            method=method,
            paid_at=paid_at,
        )
        occurrence.refresh_from_db()
        return Response(self.get_serializer(occurrence).data)
