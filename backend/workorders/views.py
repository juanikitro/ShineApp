from rest_framework import decorators, response, status, viewsets

from core.audit import AuditedModelViewSetMixin, audit_snapshot, record_audit_event
from core.permissions import business_from_request
from notifications.service import send_work_order_ready
from scheduling.models import Reservation
from scheduling.services import ensure_reservation_work_order

from .models import WorkOrder
from .serializers import WorkOrderSerializer


class WorkOrderViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("reservation_status",)
    queryset = WorkOrder.objects.select_related("reservation", "customer", "vehicle", "service").all()
    serializer_class = WorkOrderSerializer

    def get_queryset(self):
        queryset = self.queryset
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(reservation__status=status_filter)
        return queryset

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
