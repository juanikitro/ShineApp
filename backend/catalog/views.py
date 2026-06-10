from collections import defaultdict
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone
from rest_framework import decorators, permissions, response, viewsets
from rest_framework.exceptions import ValidationError

from core.audit import AuditedModelViewSetMixin
from core.permissions import CanViewEconomy, EmployerRequiredForUnsafe
from quotes.models import Quote, QuoteItem
from scheduling.models import Reservation, ReservationItem
from workorders.models import WorkOrder
from .models import Sector, Service
from .serializers import SectorSerializer, ServiceSerializer


class SectorViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    serializer_class = SectorSerializer
    queryset = Sector.objects.all()
    permission_classes = [permissions.IsAuthenticated, EmployerRequiredForUnsafe]

    def get_queryset(self):
        queryset = self.queryset
        if self.request.query_params.get("include_inactive") != "1":
            queryset = queryset.filter(is_active=True)
        return queryset

    def perform_destroy(self, instance):
        business = self.get_business() or instance.business
        remaining = (
            Sector.objects.filter(business=business, is_active=True)
            .exclude(pk=instance.pk)
            .count()
        )
        if remaining == 0:
            raise ValidationError("No se puede eliminar el unico sector activo del negocio.")
        instance.delete()


def service_history_bucket(**extra):
    bucket = {
        "work_orders_count": 0,
        "billed_total": Decimal("0.00"),
        "paid_total": Decimal("0.00"),
        "balance_due_total": Decimal("0.00"),
        "material_cost_total": Decimal("0.00"),
        "margin_total": Decimal("0.00"),
    }
    bucket.update(extra)
    return bucket


def add_service_history_amounts(bucket, order, paid_total, balance_due, material_total, margin):
    bucket["work_orders_count"] += 1
    bucket["billed_total"] += order.total_amount
    bucket["paid_total"] += paid_total
    bucket["balance_due_total"] += balance_due
    bucket["material_cost_total"] += material_total
    bucket["margin_total"] += margin


def service_history_ranking(rows, label_key):
    return sorted(
        rows.values(),
        key=lambda item: (
            -item["work_orders_count"],
            -item["billed_total"],
            str(item[label_key]).lower(),
        ),
    )


def service_history_average_ticket(total, count):
    if not count:
        return Decimal("0.00")
    return (total / Decimal(count)).quantize(Decimal("0.01"))


def service_history_local_date(value):
    if value is None:
        return None
    if timezone.is_naive(value):
        return value.date()
    return timezone.localtime(value).date()


def service_history_quote_services(quote):
    labels = []
    for item in quote.items.all():
        label = item.description or (item.service.name if item.service_id and item.service else "")
        if label:
            labels.append(label)
    return ", ".join(labels) if labels else "Sin servicios"


def service_history_reservation_row(reservation):
    return {
        "id": reservation.id,
        "day": reservation.day,
        "exit_day": reservation.exit_day,
        "start_time": reservation.start_time,
        "exit_time": reservation.exit_time,
        "status": reservation.status,
        "customer": reservation.customer.name,
        "customer_id": reservation.customer_id,
        "vehicle": str(reservation.vehicle),
        "vehicle_id": reservation.vehicle_id,
        "services": reservation.service_names_display,
    }


def service_history_quote_row(quote):
    return {
        "id": quote.id,
        "quote_date": quote.quote_date,
        "status": quote.status,
        "customer": quote.customer.name,
        "customer_id": quote.customer_id,
        "vehicle": str(quote.vehicle) if quote.vehicle_id else "",
        "vehicle_id": quote.vehicle_id,
        "services": service_history_quote_services(quote),
        "total": quote.total,
    }


class ServiceViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    queryset = Service.objects.all()
    permission_classes = [permissions.IsAuthenticated, EmployerRequiredForUnsafe]

    def get_queryset(self):
        queryset = self.queryset
        if self.request.query_params.get("include_inactive") != "1":
            queryset = queryset.filter(is_active=True)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(service_type__icontains=search))
        return queryset

    def perform_destroy(self, instance):
        instance.delete()

    @decorators.action(detail=True, methods=["get"], permission_classes=[CanViewEconomy])
    def history(self, request, pk=None):
        service = self.get_object()
        today = timezone.localdate()
        work_orders = list(
            WorkOrder.objects.filter(service=service)
            .filter(reservation__status__in=WorkOrder.operational_statuses())
            .select_related("customer", "vehicle")
            .prefetch_related("payments", "material_consumptions")
            .order_by("-received_at", "-created_at", "-id")
        )
        active_work_orders = [order for order in work_orders if order.status != WorkOrder.Status.DELIVERED][:5]
        upcoming_reservations_queryset = (
            Reservation.objects.filter(
                service=service,
                day__gte=today,
                status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
            )
            .select_related("customer", "vehicle", "service")
            .prefetch_related("items__service")
            .order_by("day", "start_time", "id")
        )
        upcoming_reservations_count = upcoming_reservations_queryset.count()
        upcoming_reservations = list(upcoming_reservations_queryset[:5])
        quotes_queryset = (
            Quote.objects.filter(items__service=service)
            .select_related("customer", "vehicle")
            .prefetch_related("items__service")
            .distinct()
            .order_by("-quote_date", "-id")
        )
        quotes_total = quotes_queryset.count()
        open_quotes_count = quotes_queryset.filter(
            status__in=[Quote.Status.DRAFT, Quote.Status.SENT]
        ).count()
        recent_quotes = list(quotes_queryset[:5])
        quote_item_usages_count = QuoteItem.objects.filter(service=service).count()
        additional_reservation_items_count = ReservationItem.objects.filter(service=service).exclude(
            reservation__service=service
        ).count()

        totals = service_history_bucket()
        top_customers = defaultdict(
            lambda: {
                **service_history_bucket(),
                "id": None,
                "name": "",
                "phone": "",
            }
        )
        top_vehicles = defaultdict(
            lambda: {
                **service_history_bucket(),
                "id": None,
                "label": "",
                "license_plate": "",
                "brand": "",
                "model": "",
            }
        )

        for order in work_orders:
            order_payments = list(order.payments.all())
            order_consumptions = list(order.material_consumptions.all())
            paid_total = sum((payment.amount for payment in order_payments), Decimal("0.00"))
            material_total = sum(
                (consumption.estimated_total_cost for consumption in order_consumptions),
                Decimal("0.00"),
            )
            balance_due = max(order.total_amount - paid_total, Decimal("0.00"))
            margin = order.total_amount - material_total
            add_service_history_amounts(
                totals,
                order,
                paid_total,
                balance_due,
                material_total,
                margin,
            )

            customer_summary = top_customers[order.customer_id]
            customer_summary["id"] = order.customer_id
            customer_summary["name"] = order.customer.name
            customer_summary["phone"] = order.customer.phone
            add_service_history_amounts(
                customer_summary,
                order,
                paid_total,
                balance_due,
                material_total,
                margin,
            )

            vehicle_summary = top_vehicles[order.vehicle_id]
            vehicle_summary["id"] = order.vehicle_id
            vehicle_summary["label"] = str(order.vehicle)
            vehicle_summary["license_plate"] = order.vehicle.license_plate
            vehicle_summary["brand"] = order.vehicle.brand
            vehicle_summary["model"] = order.vehicle.model
            add_service_history_amounts(
                vehicle_summary,
                order,
                paid_total,
                balance_due,
                material_total,
                margin,
            )

        totals["sales_total"] = totals["billed_total"]
        totals["active_work_orders_count"] = len(active_work_orders)
        totals["upcoming_reservations_count"] = upcoming_reservations_count
        totals["quotes_total"] = quotes_total
        totals["open_quotes_count"] = open_quotes_count
        totals["quote_item_usages_count"] = quote_item_usages_count
        totals["additional_reservation_items_count"] = additional_reservation_items_count

        customer_rows = service_history_ranking(top_customers, "name")
        vehicle_rows = service_history_ranking(top_vehicles, "label")
        latest_order = work_orders[0] if work_orders else None
        latest_use_date = service_history_local_date(latest_order.received_at) if latest_order else None
        next_reservation = (
            service_history_reservation_row(upcoming_reservations[0])
            if upcoming_reservations
            else None
        )

        return response.Response(
            {
                "service": ServiceSerializer(service, context={"request": request}).data,
                "summary": totals,
                "insights": {
                    "last_used_at": latest_order.received_at if latest_order else None,
                    "days_since_last_use": (
                        (today - latest_use_date).days if latest_use_date else None
                    ),
                    "last_customer_name": latest_order.customer.name if latest_order else "",
                    "last_vehicle_label": str(latest_order.vehicle) if latest_order else "",
                    "average_ticket": service_history_average_ticket(
                        totals["sales_total"], totals["work_orders_count"]
                    ),
                    "next_reservation": next_reservation,
                },
                "top_customers": customer_rows,
                "top_vehicles": vehicle_rows,
                "upcoming_reservations": [
                    service_history_reservation_row(reservation)
                    for reservation in upcoming_reservations
                ],
                "active_work_orders": [
                    {
                        "id": order.id,
                        "status": order.status,
                        "customer": order.customer_id,
                        "customer_name": order.customer.name,
                        "vehicle": order.vehicle_id,
                        "vehicle_label": str(order.vehicle),
                        "total_amount": order.total_amount,
                        "paid_amount": order.paid_amount,
                        "balance_due": order.balance_due,
                        "material_cost": order.material_cost,
                        "margin": order.total_amount - order.material_cost,
                        "received_at": order.received_at,
                        "estimated_delivery_at": order.estimated_delivery_at,
                    }
                    for order in active_work_orders
                ],
                "recent_quotes": [service_history_quote_row(quote) for quote in recent_quotes],
            }
        )
