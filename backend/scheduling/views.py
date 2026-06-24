from datetime import date

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.views import APIView

from catalog.models import Sector
from core.audit import AuditedModelViewSetMixin, audit_snapshot, record_audit_event
from core.models import BusinessHours, BusinessProfile
from core.permissions import EmployerRequiredForUnsafe, business_from_request
from finance.cash import cash_day, ensure_cash_day_open
from notifications.service import send_public_request_push, send_reservation_confirmation
from quotes.models import Quote, QuoteItem
from quotes.serializers import QuoteSerializer
from whatsapp.models import WhatsAppMessage
from whatsapp.services import enqueue_automated_message
from workorders.metrics import build_work_order_financial_metrics

from .models import Reservation, ReservationMaterialOverride
from .serializers import ReservationMaterialOverrideSerializer, ReservationSerializer
from .services import ensure_reservation_work_order


def work_orders_for_reservations(reservations):
    work_orders = []
    for reservation in reservations:
        try:
            work_orders.append(reservation.work_order)
        except (AttributeError, ObjectDoesNotExist):
            continue
    return work_orders


class ReservationMaterialOverrideViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationMaterialOverrideSerializer
    permission_classes = [permissions.IsAuthenticated, EmployerRequiredForUnsafe]

    def get_queryset(self):
        business = business_from_request(self.request)
        qs = ReservationMaterialOverride.objects.select_related(
            "chosen_material",
            "service_material__material",
        ).filter(reservation__business=business)
        reservation_id = self.request.query_params.get("reservation")
        if reservation_id:
            qs = qs.filter(reservation_id=reservation_id)
        return qs


class ReservationViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("ensure_reservation_work_order",)
    queryset = Reservation.objects.select_related(
        "customer",
        "vehicle",
        "service",
        "work_order",
        "work_order__customer",
        "work_order__vehicle",
        "work_order__service",
    ).prefetch_related(
        "items",
        "items__service",
        "material_overrides__service_material__material",
        "material_overrides__chosen_material",
    ).all()
    serializer_class = ReservationSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        metrics_map = getattr(self, "_work_order_financial_metrics_map", None)
        if metrics_map is not None:
            context["work_order_financial_metrics_map"] = metrics_map
        return context

    def get_queryset(self):
        queryset = self.queryset
        day = self.request.query_params.get("day")
        status_filter = self.request.query_params.get("status")
        if day:
            queryset = queryset.filter(day=day)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        rows = page if page is not None else list(queryset)
        self._work_order_financial_metrics_map = build_work_order_financial_metrics(
            work_orders_for_reservations(rows)
        )
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(rows, many=True)
        return response.Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        reservation = self.get_object()
        profile = BusinessProfile.get_solo(business=reservation.business)
        if profile.reservation_use_canceled and reservation.status != Reservation.Status.CANCELED:
            return response.Response(
                {"detail": "Solo se pueden eliminar reservas canceladas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            work_order = reservation.work_order
        except ObjectDoesNotExist:
            work_order = None
        has_inventory_links = reservation.stock_movements.exists() or (
            work_order is not None
            and (
                work_order.material_consumptions.exists()
                or work_order.stock_movements.exists()
            )
        )
        if has_inventory_links:
            return response.Response(
                {
                    "detail": (
                        "La reserva tiene movimientos de inventario asociados. "
                        "Revertilos antes de eliminarla."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if work_order is not None:
            for payment in work_order.payments.all():
                ensure_cash_day_open(
                    cash_day(payment.paid_at),
                    field="paid_at",
                    business=payment.business,
                )
        return super().destroy(request, *args, **kwargs)

    @decorators.action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        reservation = self.get_object()
        before = audit_snapshot(reservation)
        serializer = self.get_serializer(reservation, data={"status": Reservation.Status.CONFIRMED}, partial=True)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        send_reservation_confirmation(reservation)
        enqueue_automated_message(
            event=WhatsAppMessage.Event.RESERVATION_CONFIRMED,
            source=reservation,
        )
        try:
            send_public_request_push(reservation.public_request)
        except ObjectDoesNotExist:
            pass
        record_audit_event(
            request=request,
            action="confirm",
            instance=reservation,
            before=before,
            after=audit_snapshot(reservation),
        )
        return response.Response(self.get_serializer(reservation).data)

    @decorators.action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        before = audit_snapshot(reservation)
        profile = BusinessProfile.get_solo(business=reservation.business)
        if not profile.reservation_use_canceled:
            reservation_id = reservation.pk
            reservation.delete()
            record_audit_event(
                request=request,
                action="delete",
                instance=None,
                before=before,
                after=None,
                module="scheduling",
                entity_type="reservation",
                entity_id=str(reservation_id),
                metadata={"reason": "cancel_without_canceled_status"},
            )
            return response.Response(status=status.HTTP_204_NO_CONTENT)
        reservation.status = Reservation.Status.CANCELED
        reservation.save(update_fields=["status", "updated_at"])
        record_audit_event(
            request=request,
            action="cancel",
            instance=reservation,
            before=before,
            after=audit_snapshot(reservation),
        )
        return response.Response(self.get_serializer(reservation).data)

    @decorators.action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        reservation = self.get_object()
        before = audit_snapshot(reservation)
        reservation.status = Reservation.Status.DELIVERED
        reservation.save(update_fields=["status", "updated_at"])
        ensure_reservation_work_order(reservation)
        record_audit_event(
            request=request,
            action="complete",
            instance=reservation,
            before=before,
            after=audit_snapshot(reservation),
            metadata={"side_effects": ["ensure_reservation_work_order"]},
        )
        return response.Response(self.get_serializer(reservation).data)

    @decorators.action(detail=True, methods=["post"])
    def quote(self, request, pk=None):
        reservation = self.get_object()
        quote = Quote.objects.filter(reservation=reservation).prefetch_related("items", "items__service").first()
        if quote:
            return response.Response(QuoteSerializer(quote, context=self.get_serializer_context()).data)

        quote = Quote.objects.create(
            customer=reservation.customer,
            vehicle=reservation.vehicle,
            reservation=reservation,
            reservation_day=reservation.day,
            reservation_start_time=reservation.start_time,
            observations=reservation.notes,
        )
        for item in reservation.service_items:
            QuoteItem.objects.create(
                quote=quote,
                service=item.service,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
        quote.recalculate()
        record_audit_event(
            request=request,
            action="create_quote",
            instance=quote,
            before=None,
            after=audit_snapshot(quote),
            metadata={"reservation": reservation.id},
        )
        return response.Response(QuoteSerializer(quote, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)


class DailyAgendaView(APIView):
    def get(self, request):
        day_value = request.query_params.get("date")
        if day_value:
            day = date.fromisoformat(day_value)
        else:
            day = date.today()
        business = business_from_request(request)
        profile = BusinessProfile.get_solo(business=business)
        sector_filter = request.query_params.get("sector")
        sectors = list(Sector.objects.filter(business=business, is_active=True))
        if sector_filter:
            sectors = [sector for sector in sectors if sector.key == sector_filter]
        reservations = Reservation.objects.select_related(
            "customer",
            "vehicle",
            "service",
            "sector",
            "work_order",
            "work_order__customer",
            "work_order__vehicle",
            "work_order__service",
        ).prefetch_related("items", "items__service").filter(business=business)
        if sector_filter:
            reservations = reservations.filter(sector__key=sector_filter)
        if profile.show_stay_days_in_agenda:
            reservations = reservations.filter(day__lte=day).filter(
                Q(exit_day__gte=day) | Q(day=day, exit_day__isnull=True)
            )
        else:
            reservations = reservations.filter(day=day)
        reservation_rows = list(reservations)
        work_order_metrics = build_work_order_financial_metrics(
            work_orders_for_reservations(reservation_rows)
        )
        sectors_payload = []
        for sector in sectors:
            max_slots = Reservation.capacity_for_day(day, business=business, sector=sector)
            used_slots = Reservation.used_slots_for_day(day, business=business, sector=sector)
            sectors_payload.append(
                {
                    "id": sector.id,
                    "key": sector.key,
                    "name": sector.name,
                    "color": sector.color,
                    "icon": sector.icon,
                    "order": sector.order,
                    "max_slots": max_slots,
                    "used_slots": used_slots,
                    "available_slots": max(max_slots - used_slots, 0),
                }
            )
        day_of_week = day.weekday()  # 0=Monday, 6=Sunday
        day_hours = BusinessHours.objects.filter(
            business=business, day_of_week=day_of_week
        ).first()
        if day_hours is not None:
            is_working_day = day_hours.is_open
            day_opening_time = day_hours.opening_time.strftime("%H:%M") if day_hours.opening_time else None
            day_closing_time = day_hours.closing_time.strftime("%H:%M") if day_hours.closing_time else None
        else:
            is_working_day = True
            day_opening_time = None
            day_closing_time = None

        return response.Response(
            {
                "date": day.isoformat(),
                "is_working_day": is_working_day,
                "day_opening_time": day_opening_time,
                "day_closing_time": day_closing_time,
                "capacity_enforced": bool(profile.enforce_capacity_limit),
                "sectors": sectors_payload,
                "reservations": ReservationSerializer(
                    reservation_rows,
                    many=True,
                    context={
                        "request": request,
                        "work_order_financial_metrics_map": work_order_metrics,
                    },
                ).data,
            },
            status=status.HTTP_200_OK,
        )
