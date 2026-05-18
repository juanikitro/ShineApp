from datetime import date

from django.db.models import Q
from rest_framework import decorators, response, status, viewsets
from rest_framework.views import APIView

from notifications.service import send_reservation_confirmation
from quotes.models import Quote, QuoteItem
from quotes.serializers import QuoteSerializer
from core.audit import AuditedModelViewSetMixin, audit_snapshot, record_audit_event
from core.models import BusinessProfile
from core.permissions import business_from_request

from .models import DailyCapacity, Reservation
from .serializers import DailyCapacitySerializer, ReservationSerializer
from .services import ensure_reservation_work_order


class DailyCapacityViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = DailyCapacity.objects.all()
    serializer_class = DailyCapacitySerializer


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
    ).prefetch_related("items", "items__service").all()
    serializer_class = ReservationSerializer

    def get_queryset(self):
        queryset = self.queryset
        day = self.request.query_params.get("day")
        status_filter = self.request.query_params.get("status")
        if day:
            queryset = queryset.filter(day=day)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    @decorators.action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        reservation = self.get_object()
        before = audit_snapshot(reservation)
        serializer = self.get_serializer(reservation, data={"status": Reservation.Status.CONFIRMED}, partial=True)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        send_reservation_confirmation(reservation)
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
        capacity_row = DailyCapacity.objects.filter(business=business, day=day).first()
        max_slots = capacity_row.max_slots if capacity_row else Reservation.capacity_for_day(day, business=business)
        profile = BusinessProfile.get_solo(business=business)
        reservations = Reservation.objects.select_related(
            "customer",
            "vehicle",
            "service",
            "work_order",
            "work_order__customer",
            "work_order__vehicle",
            "work_order__service",
        ).prefetch_related("items", "items__service").filter(business=business)
        if profile.show_stay_days_in_agenda:
            reservations = reservations.filter(day__lte=day).filter(
                Q(exit_day__gte=day) | Q(day=day, exit_day__isnull=True)
            )
        else:
            reservations = reservations.filter(day=day)
        used_slots = Reservation.used_slots_for_day(day, business=business)
        return response.Response(
            {
                "date": day.isoformat(),
                "capacity_id": capacity_row.id if capacity_row else None,
                "max_slots": max_slots,
                "used_slots": used_slots,
                "available_slots": max(max_slots - used_slots, 0),
                "reservations": ReservationSerializer(reservations, many=True, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )
