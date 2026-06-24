from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import decorators, response, status, viewsets

from core.audit import AuditedModelViewSetMixin, audit_snapshot, record_audit_event
from core.permissions import business_from_request
from notifications.service import send_work_order_ready
from scheduling.models import Reservation
from scheduling.services import ensure_reservation_work_order
from whatsapp.models import WhatsAppMessage
from whatsapp.services import enqueue_automated_message

from .metrics import build_work_order_financial_metrics
from .models import WorkOrder
from .serializers import WorkOrderSerializer


def _apply_service_materials(order):
    """Crea consumos de materiales a partir de la receta del servicio (idempotente)."""
    from inventory.models import Material, MaterialConsumption

    service_materials = list(order.service.materials.select_related("material").all())
    if not service_materials:
        return
    if MaterialConsumption.objects.filter(work_order=order, is_from_service_recipe=True).exists():
        return

    today = timezone.now().date()
    with transaction.atomic():
        for sm in service_materials:
            material = Material.objects.select_for_update().get(pk=sm.material_id)
            if material.stock_quantity < sm.quantity:
                continue
            unit_cost = material.estimated_unit_cost or Decimal("0.00")
            MaterialConsumption.objects.create(
                business=order.business,
                work_order=order,
                material=material,
                consumed_at=today,
                quantity=sm.quantity,
                estimated_unit_cost=unit_cost,
                estimated_total_cost=unit_cost * sm.quantity,
                is_from_service_recipe=True,
            )
            material.stock_quantity -= sm.quantity
            material.save(update_fields=["stock_quantity", "updated_at"])


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
            return response.Response(
                {"status": f"Estado invalido. Opciones validas: {', '.join(allowed)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        before = {"status": order.status}
        with transaction.atomic():
            order.reservation.status = new_status
            order.reservation.save(update_fields=["status", "updated_at"])
            order.refresh_from_db()
            if new_status == Reservation.Status.DELIVERED:
                _apply_service_materials(order)
            if new_status == Reservation.Status.READY:
                # El aviso al cliente se encola/envia recien si la transicion
                # commitea: nunca "listo" en la DB sin haber intentado el email.
                transaction.on_commit(lambda: send_work_order_ready(order))
                enqueue_automated_message(event=WhatsAppMessage.Event.WORK_READY, source=order)
            if new_status == Reservation.Status.DELIVERED:
                enqueue_automated_message(event=WhatsAppMessage.Event.WORK_DELIVERED, source=order)
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
