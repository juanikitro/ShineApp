from django.http import FileResponse
from rest_framework import decorators, response, status, viewsets

from core.permissions import CanViewEconomy
from scheduling.serializers import ReservationSerializer

from .models import Quote
from .pdf import build_quote_pdf
from .serializers import QuoteSerializer


class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.select_related("customer", "vehicle", "reservation").prefetch_related("items", "items__service").all()
    serializer_class = QuoteSerializer
    permission_classes = [CanViewEconomy]

    @decorators.action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        quote = self.get_object()
        buffer = build_quote_pdf(quote)
        return FileResponse(
            buffer,
            as_attachment=True,
            filename=f"cotizacion-{quote.public_code or quote.id}.pdf",
            content_type="application/pdf",
        )

    @decorators.action(detail=True, methods=["post"], url_path="mark-sent")
    def mark_sent(self, request, pk=None):
        quote = self.get_object()
        quote.mark_sent()
        return response.Response(self.get_serializer(quote).data)

    @decorators.action(detail=True, methods=["get"], url_path="pdf-mark-sent")
    def pdf_mark_sent(self, request, pk=None):
        quote = self.get_object()
        quote.mark_sent()
        buffer = build_quote_pdf(quote)
        return FileResponse(
            buffer,
            as_attachment=True,
            filename=f"cotizacion-{quote.public_code or quote.id}.pdf",
            content_type="application/pdf",
        )

    @decorators.action(detail=True, methods=["post"])
    def reservation(self, request, pk=None):
        quote = self.get_object()
        if quote.reservation_id:
            return response.Response(ReservationSerializer(quote.reservation, context=self.get_serializer_context()).data)

        day = request.data.get("day") or quote.reservation_day
        start_time = request.data.get("start_time") or quote.reservation_start_time
        exit_time = request.data.get("exit_time") or None
        vehicle = request.data.get("vehicle") or quote.vehicle_id

        errors = {}
        if not day:
            errors["day"] = "Este campo es requerido para crear la reserva."
        if not vehicle:
            errors["vehicle"] = "Este campo es requerido para crear la reserva."
        if errors:
            return response.Response(errors, status=status.HTTP_400_BAD_REQUEST)

        quote_items = list(quote.items.select_related("service").all())
        if not quote_items:
            return response.Response({"items": "La cotizacion no tiene servicios."}, status=status.HTTP_400_BAD_REQUEST)
        if any(item.service_id is None for item in quote_items):
            return response.Response(
                {"items": "Todos los items deben tener un servicio para crear la reserva."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ReservationSerializer(
            data={
                "customer": quote.customer_id,
                "vehicle": vehicle,
                "day": day,
                "start_time": start_time or None,
                "exit_time": exit_time,
                "notes": quote.observations,
                "items": [
                    {
                        "service": item.service_id,
                        "description": item.description,
                        "quantity": str(item.quantity),
                        "unit_price": str(item.unit_price),
                    }
                    for item in quote_items
                ],
            },
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        quote.reservation = reservation
        quote.reservation_day = reservation.day
        quote.reservation_start_time = reservation.start_time
        quote.save(update_fields=["reservation", "reservation_day", "reservation_start_time", "updated_at"])
        return response.Response(ReservationSerializer(reservation, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)
