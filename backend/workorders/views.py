from django.db import transaction
from rest_framework import decorators, response, status, viewsets

from core.audit import AuditedModelViewSetMixin, audit_snapshot, record_audit_event
from core.permissions import business_from_request
from notifications.service import send_work_order_ready
from scheduling.models import Reservation
from scheduling.services import ensure_reservation_work_order

from .models import WorkOrder
from .metrics import build_work_order_financial_metrics
from .serializers import WorkOrderSerializer


def _auto_charge_if_enabled(order):
    from core.models import BusinessProfile, register_income_classification
    profile = BusinessProfile.get_solo(business=order.business)
    if not profile.auto_charge_on_start:
        return
    balance_due = order.balance_due
    if balance_due <= 0:
        return
    from django.utils import timezone
    from finance.cash import cash_day, is_cash_day_closed
    from finance.models import CashMovement, Payment
    paid_at = timezone.now()
    if is_cash_day_closed(cash_day(paid_at), business=order.business):
        return
    payment = Payment.objects.create(
        work_order=order,
        amount=balance_due,
        paid_at=paid_at,
    )
    CashMovement.objects.create(
        movement_type=CashMovement.MovementType.INCOME,
        category="Pago",
        subcategory=payment.get_method_display(),
        amount=payment.amount,
        occurred_at=payment.paid_at,
        description=f"Cobro automatico orden #{payment.work_order_id}",
        payment=payment,
        business=payment.business,
    )
    register_income_classification("Pago", payment.get_method_display(), business=payment.business)


class WorkOrderViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("reservation_status",)
    queryset = WorkOrder.objects.select_related("reservation", "customer", "vehicle", "service").all()
    serializer_class = WorkOrderSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        metrics_map = getattr(self, "_work_order_financial_metrics_map", None)
        if metrics_map is not None:
            context["work_order_financial_metrics_map"] = metrics_map
        return context

    def get_queryset(self):
        queryset = self.queryset
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(reservation__status=status_filter)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        rows = page if page is not None else list(queryset)
        self._work_order_financial_metrics_map = build_work_order_financial_metrics(rows)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(rows, many=True)
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        order = self.get_object()
        new_status = "delivered" if request.data.get("status") == "completed" else request.data.get("status")
        allowed = [choice[0] for choice in Reservation.Status.choices]
        if new_status not in allowed:
            return response.Response({"status": "Estado invalido."}, status=status.HTTP_400_BAD_REQUEST)
        before = {"status": order.status}
        order.reservation.status = new_status
        order.reservation.save(update_fields=["status", "updated_at"])
        order.refresh_from_db()
        if new_status == Reservation.Status.IN_PROGRESS:
            try:
                with transaction.atomic():
                    _auto_charge_if_enabled(order)
            except Exception:
                pass
        if new_status == Reservation.Status.READY:
            send_work_order_ready(order)
        record_audit_event(
            request=request,
            action="status",
            instance=order,
            before=before,
            after={"status": order.status},
            metadata={"reservation": order.reservation_id},
        )
        return response.Response(self.get_serializer(order).data)

    @decorators.action(detail=False, methods=["post"], url_path="from-reservation")
    def from_reservation(self, request):
        reservation = Reservation.objects.get(
            business=business_from_request(request),
            pk=request.data.get("reservation"),
        )
        already_existed = WorkOrder.objects.filter(reservation=reservation).exists()
        order = ensure_reservation_work_order(reservation)
        response_status = status.HTTP_200_OK if already_existed else status.HTTP_201_CREATED
        if not already_existed:
            record_audit_event(
                request=request,
                action="create",
                instance=order,
                before=None,
                after=audit_snapshot(order),
                metadata={"source": "from_reservation"},
            )
        return response.Response(self.get_serializer(order).data, status=response_status)

    def destroy(self, request, *args, **kwargs):
        return response.Response(
            {"detail": "La orden de trabajo forma parte de la reserva y no se elimina por separado."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
