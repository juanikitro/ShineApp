from collections import defaultdict
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import decorators, response, viewsets

from core.audit import AuditedModelViewSetMixin
from core.permissions import CanViewEconomy, business_from_request, can_view_economy, scope_queryset_to_business
from finance.models import Payment
from quotes.models import Quote
from scheduling.models import Reservation
from workorders.metrics import build_work_order_financial_metrics
from workorders.models import WorkOrder

from .birthdays import upcoming_birthday_customers
from .models import Customer, Vehicle
from .serializers import CustomerListSerializer, CustomerSerializer, VehicleSerializer


def customer_history_bucket(**extra):
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


def add_customer_history_amounts(bucket, order, paid_total, balance_due, material_total, margin):
    bucket["work_orders_count"] += 1
    bucket["billed_total"] += order.total_amount
    bucket["paid_total"] += paid_total
    bucket["balance_due_total"] += balance_due
    bucket["material_cost_total"] += material_total
    bucket["margin_total"] += margin


def customer_history_ranking(rows, label_key):
    return sorted(
        rows.values(),
        key=lambda item: (
            -item["work_orders_count"],
            -item["billed_total"],
            str(item[label_key]).lower(),
        ),
    )


def customer_history_average_ticket(total, count):
    if not count:
        return Decimal("0.00")
    return (total / Decimal(count)).quantize(Decimal("0.01"))


def customer_history_average_gap_days(visit_dates):
    if len(visit_dates) < 2:
        return None
    ordered = sorted(visit_dates)
    gaps = [(ordered[index] - ordered[index - 1]).days for index in range(1, len(ordered))]
    if not gaps:
        return None
    return round(sum(gaps) / len(gaps))


def customer_history_local_date(value):
    if value is None:
        return None
    if timezone.is_naive(value):
        return value.date()
    return timezone.localtime(value).date()


def customer_history_quote_services(quote):
    labels = []
    for item in quote.items.all():
        label = item.description or (item.service.name if item.service_id and item.service else "")
        if label:
            labels.append(label)
    return ", ".join(labels) if labels else "Sin servicios"


def customer_history_reservation_row(reservation):
    return {
        "id": reservation.id,
        "day": reservation.day,
        "exit_day": reservation.exit_day,
        "start_time": reservation.start_time,
        "exit_time": reservation.exit_time,
        "status": reservation.status,
        "vehicle": str(reservation.vehicle),
        "vehicle_id": reservation.vehicle_id,
        "services": reservation.service_names_display,
    }


def customer_history_quote_row(quote):
    return {
        "id": quote.id,
        "quote_date": quote.quote_date,
        "status": quote.status,
        "vehicle": str(quote.vehicle) if quote.vehicle_id else "",
        "vehicle_id": quote.vehicle_id,
        "services": customer_history_quote_services(quote),
        "total": quote.total,
    }


def customer_list_insights_defaults(include_economy=False):
    defaults = {
        "last_visit_at": None,
        "days_since_last_visit": None,
        "last_service_name": "",
        "last_vehicle_label": "",
        "next_reservation": None,
        "has_upcoming_reservation": False,
        "needs_follow_up": True,
    }
    if include_economy:
        defaults.update(
            {
                "balance_due_total": Decimal("0.00"),
                "has_balance_due": False,
                "open_quotes_count": 0,
            }
        )
    return defaults


def customer_list_reservation_row(reservation):
    return {
        "id": reservation.id,
        "day": reservation.day,
        "start_time": reservation.start_time,
        "status": reservation.status,
        "vehicle_label": str(reservation.vehicle),
        "service_name": reservation.service_names_display,
    }


def build_customer_list_insights(queryset, include_economy=False):
    customer_ids = list(queryset.values_list("id", flat=True))
    insights = {
        customer_id: customer_list_insights_defaults(include_economy)
        for customer_id in customer_ids
    }
    if not customer_ids:
        return insights

    today = timezone.localdate()
    work_orders = list(
        WorkOrder.objects.filter(customer_id__in=customer_ids)
        .filter(reservation__status__in=WorkOrder.operational_statuses())
        .select_related("service", "vehicle")
        .annotate(paid_total=Sum("payments__amount"))
        .order_by("customer_id", "-received_at", "-created_at", "-id")
    )
    for order in work_orders:
        bucket = insights[order.customer_id]
        if bucket["last_visit_at"] is None:
            latest_visit_date = customer_history_local_date(order.received_at)
            bucket["last_visit_at"] = order.received_at
            bucket["days_since_last_visit"] = (
                (today - latest_visit_date).days if latest_visit_date else None
            )
            bucket["last_service_name"] = order.service.name
            bucket["last_vehicle_label"] = str(order.vehicle)
        if include_economy:
            paid_total = order.paid_total or Decimal("0.00")
            balance_due = max(order.total_amount - paid_total, Decimal("0.00"))
            bucket["balance_due_total"] += balance_due

    upcoming_reservations = list(
        Reservation.objects.filter(
            customer_id__in=customer_ids,
            day__gte=today,
            status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
        )
        .select_related("vehicle", "service")
        .prefetch_related("items__service")
        .order_by("customer_id", "day", "start_time", "id")
    )
    for reservation in upcoming_reservations:
        bucket = insights[reservation.customer_id]
        if bucket["next_reservation"] is None:
            bucket["next_reservation"] = customer_list_reservation_row(reservation)
            bucket["has_upcoming_reservation"] = True

    if include_economy:
        quote_counts = (
            Quote.objects.filter(
                customer_id__in=customer_ids,
                status__in=[Quote.Status.DRAFT, Quote.Status.SENT],
            )
            .values("customer_id")
            .annotate(open_quotes_count=Count("id"))
        )
        for row in quote_counts:
            bucket = insights[row["customer_id"]]
            bucket["open_quotes_count"] = row["open_quotes_count"]
            bucket["has_balance_due"] = bucket["balance_due_total"] > 0

    for bucket in insights.values():
        bucket["needs_follow_up"] = not bucket["has_upcoming_reservation"]
        if include_economy and not bucket["has_balance_due"]:
            bucket["has_balance_due"] = bucket["balance_due_total"] > 0

    return insights


class ActiveQuerysetMixin:
    search_fields = []

    def get_queryset(self):
        include_inactive = self.request.query_params.get("include_inactive") == "1"
        if include_inactive and hasattr(self.queryset.model, "all_objects"):
            queryset = self.queryset.model.all_objects.all()
        else:
            queryset = self.queryset
        queryset = scope_queryset_to_business(queryset, business_from_request(self.request))
        if not include_inactive:
            queryset = queryset.filter(is_active=True)
        search = self.request.query_params.get("search")
        if search:
            query = Q()
            for field in self.search_fields:
                query |= Q(**{f"{field}__icontains": search})
            queryset = queryset.filter(query)
        return queryset

    def perform_destroy(self, instance):
        instance.delete()


class CustomerViewSet(AuditedModelViewSetMixin, ActiveQuerysetMixin, viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    search_fields = ["name", "phone", "email"]

    def get_serializer_class(self):
        if self.action == "list":
            return CustomerListSerializer
        return super().get_serializer_class()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        insights_map = getattr(self, "_customer_list_insights_map", None)
        if insights_map is not None:
            context["customer_list_insights_map"] = insights_map
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            # insights solo para la pagina visible, no para toda la cartera (las
            # metricas son por-cliente, asi que limitar a la pagina no las altera).
            self._customer_list_insights_map = build_customer_list_insights(
                Customer.objects.filter(pk__in=[customer.pk for customer in page]),
                include_economy=can_view_economy(request.user),
            )
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        self._customer_list_insights_map = build_customer_list_insights(
            queryset, include_economy=can_view_economy(request.user)
        )
        serializer = self.get_serializer(queryset, many=True)
        return response.Response(serializer.data)

    @decorators.action(detail=False, methods=["get"])
    def birthdays(self, request):
        try:
            days = int(request.query_params.get("days", 3))
        except ValueError:
            days = 3
        customers = upcoming_birthday_customers(
            self.get_queryset().filter(birthday_month__isnull=False, birthday_day__isnull=False),
            days=days,
        )
        return response.Response(
            {
                "days": max(days, 0),
                "results": CustomerSerializer(customers, many=True, context={"request": request}).data,
            }
        )

    @decorators.action(detail=True, methods=["get"], permission_classes=[CanViewEconomy])
    def history(self, request, pk=None):
        customer = self.get_object()
        today = timezone.localdate()
        work_orders = list(
            WorkOrder.objects.filter(customer=customer)
            .filter(reservation__status__in=WorkOrder.operational_statuses())
            .select_related("service", "vehicle")
            .prefetch_related("payments", "material_consumptions__material")
            .order_by("-received_at", "-created_at", "-id")
        )
        upcoming_reservations_queryset = (
            Reservation.objects.filter(
                customer=customer,
                day__gte=today,
                status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
            )
            .select_related("vehicle", "service")
            .prefetch_related("items__service")
            .order_by("day", "start_time", "id")
        )
        upcoming_reservations_count = upcoming_reservations_queryset.count()
        upcoming_reservations = list(upcoming_reservations_queryset[:5])
        quotes_queryset = (
            Quote.objects.filter(customer=customer)
            .select_related("vehicle")
            .prefetch_related("items__service")
            .order_by("-quote_date", "-id")
        )
        quotes_total = quotes_queryset.count()
        open_quotes_count = quotes_queryset.filter(
            status__in=[Quote.Status.DRAFT, Quote.Status.SENT]
        ).count()
        recent_quotes = list(quotes_queryset[:5])
        payments_total = (
            Payment.objects.filter(work_order__customer=customer).aggregate(total=Sum("amount"))["total"] or 0
        )
        totals = customer_history_bucket()
        services = defaultdict(
            lambda: {
                **customer_history_bucket(),
                "id": None,
                "name": "",
            }
        )
        vehicles_ranking = defaultdict(
            lambda: {
                **customer_history_bucket(),
                "id": None,
                "label": "",
                "license_plate": "",
                "brand": "",
                "model": "",
            }
        )
        brands_ranking = defaultdict(lambda: {**customer_history_bucket(), "name": ""})
        order_rows = []
        payment_rows = []
        balance_due_work_orders_count = 0
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
            if balance_due > 0:
                balance_due_work_orders_count += 1
            add_customer_history_amounts(totals, order, paid_total, balance_due, material_total, margin)

            service_summary = services[order.service_id]
            service_summary["id"] = order.service_id
            service_summary["name"] = order.service.name
            add_customer_history_amounts(
                service_summary,
                order,
                paid_total,
                balance_due,
                material_total,
                margin,
            )

            vehicle_summary = vehicles_ranking[order.vehicle_id]
            vehicle_summary["id"] = order.vehicle_id
            vehicle_summary["label"] = str(order.vehicle)
            vehicle_summary["license_plate"] = order.vehicle.license_plate
            vehicle_summary["brand"] = order.vehicle.brand
            vehicle_summary["model"] = order.vehicle.model
            add_customer_history_amounts(
                vehicle_summary,
                order,
                paid_total,
                balance_due,
                material_total,
                margin,
            )

            brand_name = order.vehicle.brand.strip() or "Sin marca"
            brand_summary = brands_ranking[brand_name.lower()]
            brand_summary["name"] = brand_name
            add_customer_history_amounts(
                brand_summary,
                order,
                paid_total,
                balance_due,
                material_total,
                margin,
            )

            for payment in order_payments:
                payment_rows.append(
                    {
                        "id": payment.id,
                        "work_order": order.id,
                        "work_order_status": order.status,
                        "work_order_total": order.total_amount,
                        "amount": payment.amount,
                        "payment_type": payment.payment_type,
                        "method": payment.method,
                        "paid_at": payment.paid_at,
                        "notes": payment.notes,
                        "service": order.service.name,
                        "service_id": order.service_id,
                        "vehicle": str(order.vehicle),
                        "vehicle_id": order.vehicle_id,
                        "vehicle_brand": brand_name,
                    }
                )

            order_rows.append(
                {
                    "id": order.id,
                    "status": order.status,
                    "service": order.service.name,
                    "service_id": order.service_id,
                    "vehicle": str(order.vehicle),
                    "vehicle_id": order.vehicle_id,
                    "total_amount": order.total_amount,
                    "paid_amount": paid_total,
                    "balance_due": balance_due,
                    "material_cost": material_total,
                    "margin": margin,
                    "received_at": order.received_at,
                    "created_at": order.created_at,
                    "payments": [
                        {
                            "id": payment.id,
                            "amount": payment.amount,
                            "payment_type": payment.payment_type,
                            "method": payment.method,
                            "paid_at": payment.paid_at,
                            "notes": payment.notes,
                        }
                        for payment in order_payments
                    ],
                    "material_consumptions": [
                        {
                            "id": consumption.id,
                            "material": consumption.material_id,
                            "material_name": consumption.material.name,
                            "consumed_at": consumption.consumed_at,
                            "quantity": consumption.quantity,
                            "estimated_unit_cost": consumption.estimated_unit_cost,
                            "estimated_total_cost": consumption.estimated_total_cost,
                            "observations": consumption.observations,
                        }
                        for consumption in order_consumptions
                    ],
                }
            )
        totals["sales_total"] = totals["billed_total"]
        payment_rows.sort(key=lambda item: (item["paid_at"], item["id"]), reverse=True)
        service_rows = customer_history_ranking(services, "name")
        vehicle_rows = customer_history_ranking(vehicles_ranking, "label")
        brand_rows = customer_history_ranking(brands_ranking, "name")
        latest_order = work_orders[0] if work_orders else None
        visit_dates = [customer_history_local_date(order.received_at) for order in work_orders]
        latest_visit_date = visit_dates[0] if visit_dates else None
        next_reservation = (
            customer_history_reservation_row(upcoming_reservations[0])
            if upcoming_reservations
            else None
        )
        return response.Response(
            {
                "customer": CustomerSerializer(customer, context={"request": request}).data,
                "vehicles": VehicleSerializer(customer.vehicles.all(), many=True).data,
                "summary": totals,
                "insights": {
                    "last_visit_at": latest_order.received_at if latest_order else None,
                    "days_since_last_visit": (
                        (today - latest_visit_date).days if latest_visit_date else None
                    ),
                    "last_service_name": latest_order.service.name if latest_order else "",
                    "last_vehicle_label": str(latest_order.vehicle) if latest_order else "",
                    "average_ticket": customer_history_average_ticket(
                        totals["sales_total"], totals["work_orders_count"]
                    ),
                    "average_days_between_visits": customer_history_average_gap_days(visit_dates),
                    "balance_due_work_orders_count": balance_due_work_orders_count,
                    "open_quotes_count": open_quotes_count,
                    "quotes_total": quotes_total,
                    "upcoming_reservations_count": upcoming_reservations_count,
                    "preferred_service_name": service_rows[0]["name"] if service_rows else "",
                    "preferred_vehicle_label": vehicle_rows[0]["label"] if vehicle_rows else "",
                    "preferred_brand_name": brand_rows[0]["name"] if brand_rows else "",
                    "next_reservation": next_reservation,
                },
                "services": service_rows,
                "vehicles_ranking": vehicle_rows,
                "brands_ranking": brand_rows,
                "work_orders": order_rows,
                "payments_history": payment_rows,
                "payments_total": payments_total,
                "upcoming_reservations": [
                    customer_history_reservation_row(reservation)
                    for reservation in upcoming_reservations
                ],
                "recent_quotes": [customer_history_quote_row(quote) for quote in recent_quotes],
            }
        )


class VehicleViewSet(AuditedModelViewSetMixin, ActiveQuerysetMixin, viewsets.ModelViewSet):
    queryset = Vehicle.objects.select_related("customer").all()
    serializer_class = VehicleSerializer
    search_fields = ["license_plate", "model", "brand", "customer__name"]

    @decorators.action(detail=True, methods=["get"], permission_classes=[CanViewEconomy])
    def history(self, request, pk=None):
        vehicle = self.get_object()
        work_orders = list(
            WorkOrder.objects.filter(
                vehicle=vehicle,
                reservation__status__in=WorkOrder.operational_statuses(),
            )
            .select_related("service", "reservation")
            .order_by("-created_at")
        )
        # paid_amount / balance_due batcheados (evita 2 aggregates por orden);
        # select_related cubre order.service.name y order.status (lee reservation).
        metrics = build_work_order_financial_metrics(work_orders)
        return response.Response(
            {
                "vehicle": VehicleSerializer(vehicle).data,
                "work_orders": [
                    {
                        "id": order.id,
                        "status": order.status,
                        "service": order.service.name,
                        "total_amount": order.total_amount,
                        "paid_amount": metrics[order.id]["paid_amount"],
                        "balance_due": metrics[order.id]["balance_due"],
                    }
                    for order in work_orders
                ],
            }
        )
