from datetime import date

from django.db.models import Q
from rest_framework import decorators, response, status, viewsets
from rest_framework.views import APIView

from notifications.service import send_reservation_confirmation
from quotes.models import Quote, QuoteItem
from quotes.serializers import QuoteSerializer
from core.models import BusinessProfile

from .models import DailyCapacity, Reservation
from .serializers import DailyCapacitySerializer, ReservationSerializer
from .services import ensure_reservation_work_order


class DailyCapacityViewSet(viewsets.ModelViewSet):
    queryset = DailyCapacity.objects.all()
    serializer_class = DailyCapacitySerializer


class ReservationViewSet(viewsets.ModelViewSet):
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
        serializer = self.get_serializer(reservation, data={"status": Reservation.Status.CONFIRMED}, partial=True)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        send_reservation_confirmation(reservation)
        return response.Response(self.get_serializer(reservation).data)

    @decorators.action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        reservation.status = Reservation.Status.CANCELED
        reservation.save(update_fields=["status", "updated_at"])
        return response.Response(self.get_serializer(reservation).data)

    @decorators.action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        reservation = self.get_object()
        reservation.status = Reservation.Status.COMPLETED
        reservation.save(update_fields=["status", "updated_at"])
        ensure_reservation_work_order(reservation)
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
        return response.Response(QuoteSerializer(quote, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)


class DailyAgendaView(APIView):
    def get(self, request):
        day_value = request.query_params.get("date")
        if day_value:
            day = date.fromisoformat(day_value)
        else:
            day = date.today()
        capacity_row = DailyCapacity.objects.filter(day=day).first()
        max_slots = capacity_row.max_slots if capacity_row else Reservation.capacity_for_day(day)
        profile = BusinessProfile.get_solo()
        reservations = Reservation.objects.select_related(
            "customer",
            "vehicle",
            "service",
            "work_order",
            "work_order__customer",
            "work_order__vehicle",
            "work_order__service",
        ).prefetch_related("items", "items__service")
        if profile.show_stay_days_in_agenda:
            reservations = reservations.filter(day__lte=day).filter(
                Q(exit_day__gte=day) | Q(day=day, exit_day__isnull=True)
            )
        else:
            reservations = reservations.filter(day=day)
        used_slots = Reservation.used_slots_for_day(day)
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
