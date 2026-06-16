from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import business_from_request, can_view_economy
from customers.birthdays import upcoming_birthday_customers
from customers.models import Customer
from customers.serializers import CustomerSerializer
from debts.models import Debt, DebtPayment
from finance.cash import cash_movement_cashflow_effect
from finance.models import CashMovement, Payment
from fixed_expenses.models import FixedExpenseOccurrence
from inventory.models import MaterialConsumption, MaterialPurchase, StockMovement, StockMovementLine
from workorders.metrics import build_work_order_financial_metrics
from workorders.models import WorkOrder

ZERO = Decimal("0.00")
MONEY_FIELD = DecimalField(max_digits=12, decimal_places=2)
RECEIVABLE_AGING_BUCKETS = [
    ("0_7", "0-7 dias", 0, 7),
    ("8_15", "8-15 dias", 8, 15),
    ("16_30", "16-30 dias", 16, 30),
    ("31_plus", "+31 dias", 31, None),
]
COMPARISON_METRICS = [
    ("billed_total", "Facturado", "higher-is-good"),
    ("collected_total", "Cobrado", "higher-is-good"),
    ("estimated_margin_total", "Margen estimado", "higher-is-good"),
    ("cashflow_balance", "Caja real", "higher-is-good"),
    ("balance_due_total", "Por cobrar", "higher-is-bad"),
    ("material_cost_total", "Materiales consumidos", "neutral"),
]


def parse_day(value, fallback):
    return date.fromisoformat(value) if value else fallback


def decimal_sum(queryset, field):
    return queryset.aggregate(total=Sum(field))["total"] or ZERO


def receivable_aging_template():
    return [
        {
            "id": bucket_id,
            "label": label,
            "amount": ZERO,
            "count": 0,
        }
        for bucket_id, label, _start, _end in RECEIVABLE_AGING_BUCKETS
    ]


def receivable_aging_bucket_id(age_days):
    for bucket_id, _label, start, end in RECEIVABLE_AGING_BUCKETS:
        if age_days >= start and (end is None or age_days <= end):
            return bucket_id
    return "31_plus"


def local_date_for_datetime(value):
    if not value:
        return date.today()
    return timezone.localtime(value).date() if timezone.is_aware(value) else value.date()


def work_order_dashboard_row(order, metrics, today):
    order_metrics = metrics[order.id]
    created_on = local_date_for_datetime(order.created_at)
    material_cost = order_metrics["material_cost"]
    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "customer_name": order.customer.name,
        "vehicle_id": order.vehicle_id,
        "vehicle_label": str(order.vehicle),
        "service_id": order.service_id,
        "service_name": order.service.name,
        "service_icon": order.service.icon,
        "status": order.status,
        "created_on": created_on.isoformat(),
        "received_at": order.received_at.isoformat() if order.received_at else None,
        "total_amount": order.total_amount or ZERO,
        "paid_amount": order_metrics["paid_amount"],
        "balance_due": order_metrics["balance_due"],
        "material_cost": material_cost,
        "estimated_margin": (order.total_amount or ZERO) - material_cost,
        "age_days": max((today - created_on).days, 0),
    }


def ranking_entry_for_group(group):
    return {
        **group,
        "average_ticket": group["billed_total"] / group["work_orders_count"]
        if group["work_orders_count"]
        else ZERO,
    }


def work_order_rankings(work_orders, metrics):
    customers = defaultdict(
        lambda: {
            "customer_id": None,
            "customer_name": "",
            "billed_total": ZERO,
            "collected_total": ZERO,
            "balance_due_total": ZERO,
            "estimated_margin_total": ZERO,
            "work_orders_count": 0,
        }
    )
    services = defaultdict(
        lambda: {
            "service_id": None,
            "service_name": "",
            "service_icon": "",
            "billed_total": ZERO,
            "collected_total": ZERO,
            "balance_due_total": ZERO,
            "estimated_margin_total": ZERO,
            "work_orders_count": 0,
        }
    )
    sectors = defaultdict(
        lambda: {
            "sector_id": None,
            "sector_name": "",
            "sector_color": "",
            "billed_total": ZERO,
            "collected_total": ZERO,
            "balance_due_total": ZERO,
            "estimated_margin_total": ZERO,
            "work_orders_count": 0,
        }
    )
    order_margins = []

    for order in work_orders:
        order_metrics = metrics[order.id]
        billed = order.total_amount or ZERO
        collected = order_metrics["paid_amount"]
        balance_due = order_metrics["balance_due"]
        material_cost = order_metrics["material_cost"]
        estimated_margin = billed - material_cost
        customer_group = customers[order.customer_id]
        customer_group.update(
            {
                "customer_id": order.customer_id,
                "customer_name": order.customer.name,
            }
        )
        service_group = services[order.service_id]
        service_group.update(
            {
                "service_id": order.service_id,
                "service_name": order.service.name,
                "service_icon": order.service.icon,
            }
        )
        for group in (customer_group, service_group):
            group["billed_total"] += billed
            group["collected_total"] += collected
            group["balance_due_total"] += balance_due
            group["estimated_margin_total"] += estimated_margin
            group["work_orders_count"] += 1
        if order.sector_id:
            sector_group = sectors[order.sector_id]
            sector_group.update(
                {
                    "sector_id": order.sector_id,
                    "sector_name": order.sector.name if order.sector else "",
                    "sector_color": order.sector.color if order.sector else "",
                }
            )
            sector_group["billed_total"] += billed
            sector_group["collected_total"] += collected
            sector_group["balance_due_total"] += balance_due
            sector_group["estimated_margin_total"] += estimated_margin
            sector_group["work_orders_count"] += 1
        order_margins.append(
            {
                "id": order.id,
                "customer_name": order.customer.name,
                "vehicle_label": str(order.vehicle),
                "service_name": order.service.name,
                "status": order.status,
                "billed_total": billed,
                "material_cost": material_cost,
                "estimated_margin": estimated_margin,
            }
        )

    return {
        "top_customers_by_billed": [
            ranking_entry_for_group(group)
            for group in sorted(
                customers.values(),
                key=lambda item: item["billed_total"],
                reverse=True,
            )[:5]
        ],
        "top_services_by_billed": [
            ranking_entry_for_group(group)
            for group in sorted(
                services.values(),
                key=lambda item: item["billed_total"],
                reverse=True,
            )[:5]
        ],
        "top_work_orders_by_margin": sorted(
            order_margins,
            key=lambda item: item["estimated_margin"],
            reverse=True,
        )[:5],
        "by_sector": [
            ranking_entry_for_group(group)
            for group in sorted(
                sectors.values(),
                key=lambda item: item["billed_total"],
                reverse=True,
            )
        ],
    }


def work_order_financials(queryset, today=None):
    today = today or date.today()
    work_orders = list(
        queryset.select_related("customer", "vehicle", "service", "sector", "reservation")
    )
    metrics = build_work_order_financial_metrics(work_orders)
    billed_total = sum((order.total_amount or ZERO for order in work_orders), ZERO)
    balance_due_total = ZERO
    work_orders_with_balance_due_count = 0
    receivables_aging = receivable_aging_template()
    receivables_aging_by_id = {bucket["id"]: bucket for bucket in receivables_aging}
    receivables_by_customer = defaultdict(
        lambda: {
            "customer_id": None,
            "customer_name": "",
            "balance_due_total": ZERO,
            "work_orders_count": 0,
            "oldest_balance_days": 0,
            "work_orders": [],
        }
    )
    for order in work_orders:
        order_metrics = metrics[order.id]
        balance_due = order_metrics["balance_due"]
        balance_due_total += balance_due
        if balance_due > ZERO:
            row = work_order_dashboard_row(order, metrics, today)
            work_orders_with_balance_due_count += 1
            customer_summary = receivables_by_customer[order.customer_id]
            customer_summary["customer_id"] = order.customer_id
            customer_summary["customer_name"] = order.customer.name
            customer_summary["balance_due_total"] += balance_due
            customer_summary["work_orders_count"] += 1
            customer_summary["oldest_balance_days"] = max(
                customer_summary["oldest_balance_days"],
                row["age_days"],
            )
            customer_summary["work_orders"].append(row)
            aging_bucket = receivables_aging_by_id[receivable_aging_bucket_id(row["age_days"])]
            aging_bucket["amount"] += balance_due
            aging_bucket["count"] += 1
    top_receivables = sorted(
        receivables_by_customer.values(),
        key=lambda item: item["balance_due_total"],
        reverse=True,
    )[:5]
    for customer_summary in top_receivables:
        customer_summary["work_orders"].sort(
            key=lambda item: (item["age_days"], item["balance_due"]),
            reverse=True,
        )
        hidden_count = max(len(customer_summary["work_orders"]) - 5, 0)
        customer_summary["hidden_work_orders_count"] = hidden_count
        customer_summary["work_orders"] = customer_summary["work_orders"][:5]
    return {
        "billed_total": billed_total,
        "work_orders_count": len(work_orders),
        "balance_due_total": balance_due_total,
        "work_orders_with_balance_due_count": work_orders_with_balance_due_count,
        "top_receivables": top_receivables,
        "receivables_aging": receivables_aging,
        "rankings": work_order_rankings(work_orders, metrics),
    }


def cashflow_totals_for_period(business, date_from, date_to):
    movements = CashMovement.objects.select_related(
        "payment",
        "material_purchase",
        "stock_movement",
        "debt",
    ).filter(
        business=business,
        occurred_at__date__gte=date_from,
        occurred_at__date__lte=date_to,
    )
    cash_movements = [movement for movement in movements if cash_movement_cashflow_effect(movement)]
    income = sum(
        (
            movement.amount
            for movement in cash_movements
            if movement.movement_type == CashMovement.MovementType.INCOME
        ),
        ZERO,
    )
    expense = sum(
        (
            movement.amount
            for movement in cash_movements
            if movement.movement_type == CashMovement.MovementType.EXPENSE
        ),
        ZERO,
    )
    expense += decimal_sum(
        DebtPayment.objects.filter(
            business=business,
            paid_at__gte=date_from,
            paid_at__lte=date_to,
        ),
        "amount",
    )
    return {
        "cashflow_income_total": income,
        "cashflow_expense_total": expense,
        "cashflow_balance": income - expense,
    }


def cash_by_category_for_period(business, date_from, date_to):
    """Income and expense of the period broken down by cash category.

    Uses the exact same rows/filters as ``cashflow_totals_for_period`` (effect
    movements + debt payments), so each side sums to its cashflow total.
    """
    movements = CashMovement.objects.select_related(
        "payment",
        "payment__work_order__service",
        "material_purchase",
        "stock_movement",
        "debt",
    ).filter(
        business=business,
        occurred_at__date__gte=date_from,
        occurred_at__date__lte=date_to,
    )
    income = defaultdict(lambda: ZERO)
    income_by_service = defaultdict(lambda: ZERO)
    expense = defaultdict(lambda: ZERO)
    for movement in movements:
        if not cash_movement_cashflow_effect(movement):
            continue
        category = str(movement.category or "").strip() or "Sin categoria"
        if movement.movement_type == CashMovement.MovementType.INCOME:
            income[category] += movement.amount
            payment = movement.payment
            if payment and payment.work_order and payment.work_order.service:
                service_name = payment.work_order.service.name
            else:
                service_name = str(movement.category or "").strip() or "Sin servicio"
            income_by_service[service_name] += movement.amount
        elif movement.movement_type == CashMovement.MovementType.EXPENSE:
            expense[category] += movement.amount

    debt_payments_total = decimal_sum(
        DebtPayment.objects.filter(
            business=business,
            paid_at__gte=date_from,
            paid_at__lte=date_to,
        ),
        "amount",
    )
    if debt_payments_total > ZERO:
        expense["Pago de deudas"] += debt_payments_total

    def to_rows(bucket):
        return [
            {"category": category, "total": total}
            for category, total in sorted(
                bucket.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        ]

    def to_service_rows(bucket):
        return [
            {"service": service, "total": total}
            for service, total in sorted(
                bucket.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        ]

    return {
        "income_by_category": to_rows(income),
        "income_by_service": to_service_rows(income_by_service),
        "expense_by_category": to_rows(expense),
    }


def material_cost_total_for_period(business, date_from, date_to):
    legacy_consumptions = MaterialConsumption.objects.filter(
        business=business,
        consumed_at__gte=date_from,
        consumed_at__lte=date_to,
    )
    stock_consumptions = StockMovementLine.objects.filter(
        movement__movement_type=StockMovement.MovementType.CONSUMPTION,
        movement__business=business,
        movement__occurred_on__gte=date_from,
        movement__occurred_on__lte=date_to,
    )
    return decimal_sum(legacy_consumptions, "estimated_total_cost") + decimal_sum(
        stock_consumptions,
        "estimated_total_cost",
    )


def material_purchases_total_for_period(business, date_from, date_to):
    purchases = MaterialPurchase.objects.filter(
        business=business,
        purchased_at__gte=date_from,
        purchased_at__lte=date_to,
    )
    stock_purchases = StockMovement.objects.filter(
        business=business,
        movement_type=StockMovement.MovementType.PURCHASE,
        occurred_on__gte=date_from,
        occurred_on__lte=date_to,
    )
    return decimal_sum(purchases, "total_cost") + decimal_sum(stock_purchases, "total_amount")


def fixed_expenses_pending_for_period(business, date_from, date_to):
    qs = FixedExpenseOccurrence.objects.filter(
        business=business,
        status=FixedExpenseOccurrence.Status.PENDING,
        period_date__gte=date_from,
        period_date__lte=date_to,
    )
    return {
        "fixed_expenses_pending_total": qs.aggregate(total=Sum("amount"))["total"] or ZERO,
        "fixed_expenses_pending_count": qs.count(),
    }


def material_cost_rankings_for_period(business, date_from, date_to):
    materials = defaultdict(
        lambda: {
            "material_id": None,
            "material_name": "",
            "unit": "",
            "quantity": ZERO,
            "estimated_total_cost": ZERO,
            "consumptions_count": 0,
        }
    )
    legacy_rows = (
        MaterialConsumption.objects.filter(
            business=business,
            consumed_at__gte=date_from,
            consumed_at__lte=date_to,
        )
        .values("material_id", "material__name", "material__unit")
        .annotate(
            quantity=Coalesce(Sum("quantity"), Value(ZERO), output_field=MONEY_FIELD),
            estimated_total_cost=Coalesce(
                Sum("estimated_total_cost"),
                Value(ZERO),
                output_field=MONEY_FIELD,
            ),
            consumptions_count=Count("id"),
        )
    )
    stock_rows = (
        StockMovementLine.objects.filter(
            movement__movement_type=StockMovement.MovementType.CONSUMPTION,
            movement__business=business,
            movement__occurred_on__gte=date_from,
            movement__occurred_on__lte=date_to,
        )
        .values("material_id", "material__name", "material__unit")
        .annotate(
            quantity=Coalesce(Sum("quantity"), Value(ZERO), output_field=MONEY_FIELD),
            estimated_total_cost=Coalesce(
                Sum("estimated_total_cost"),
                Value(ZERO),
                output_field=MONEY_FIELD,
            ),
            consumptions_count=Count("id"),
        )
    )
    for row in [*legacy_rows, *stock_rows]:
        material_summary = materials[row["material_id"]]
        material_summary["material_id"] = row["material_id"]
        material_summary["material_name"] = row["material__name"]
        material_summary["unit"] = row["material__unit"]
        material_summary["quantity"] += row["quantity"] or ZERO
        material_summary["estimated_total_cost"] += row["estimated_total_cost"] or ZERO
        material_summary["consumptions_count"] += row["consumptions_count"] or 0
    return sorted(
        materials.values(),
        key=lambda item: item["estimated_total_cost"],
        reverse=True,
    )[:5]


def dashboard_period_summary(business, date_from, date_to, with_rankings=True):
    payments = Payment.objects.filter(
        business=business,
        paid_at__date__gte=date_from,
        paid_at__date__lte=date_to,
    )
    work_orders = WorkOrder.objects.filter(
        business=business,
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
        reservation__status__in=WorkOrder.operational_statuses(),
    )
    financials = work_order_financials(work_orders)
    material_cost_total = material_cost_total_for_period(business, date_from, date_to)
    cashflow_totals = cashflow_totals_for_period(business, date_from, date_to)
    # El periodo previo (with_rankings=False) solo aporta escalares para la
    # comparacion e insights; se saltean los rankings de materiales y el detalle de
    # gastos fijos pendientes (queries y CPU que nadie lee para ese periodo).
    if with_rankings:
        fixed_pending = fixed_expenses_pending_for_period(business, date_from, date_to)
        rankings = {
            **financials["rankings"],
            "top_materials_by_cost": material_cost_rankings_for_period(business, date_from, date_to),
        }
    else:
        fixed_pending = {"fixed_expenses_pending_total": ZERO, "fixed_expenses_pending_count": 0}
        rankings = {}
    return {
        **financials,
        "collected_total": decimal_sum(payments, "amount"),
        "material_cost_total": material_cost_total,
        "estimated_margin_total": financials["billed_total"] - material_cost_total,
        "material_purchases_total": material_purchases_total_for_period(business, date_from, date_to),
        "rankings": rankings,
        **cashflow_totals,
        **fixed_pending,
    }


SERIES_DAILY_MAX_DAYS = 62

SERIES_FLOW_KEYS = (
    "billed_total",
    "collected_total",
    "material_cost_total",
    "cashflow_income_total",
    "cashflow_expense_total",
)


def series_local_day(value):
    if isinstance(value, datetime):
        return local_date_for_datetime(value)
    return value


def series_point(day, values):
    return {
        "date": day.isoformat(),
        "billed_total": values["billed_total"],
        "collected_total": values["collected_total"],
        "estimated_margin_total": values["billed_total"] - values["material_cost_total"],
        "cashflow_balance": values["cashflow_income_total"] - values["cashflow_expense_total"],
    }


def dashboard_period_series(business, date_from, date_to):
    """Daily (or weekly for long ranges) time series of the flow metrics.

    Each metric reuses the exact same rows/filters as ``dashboard_period_summary``
    bucketed by local day, so ``sum(points[metric]) == summary[metric]`` always
    holds. ``estimated_margin_total`` and ``cashflow_balance`` are derived per day.
    Balance due is a point-in-time stock, not a flow, so it is intentionally absent.
    """
    total_days = (date_to - date_from).days + 1
    if total_days < 1:
        return {
            "interval": "day",
            "from": date_from.isoformat(),
            "to": date_to.isoformat(),
            "points": [],
        }

    daily = {
        date_from + timedelta(days=offset): {key: ZERO for key in SERIES_FLOW_KEYS}
        for offset in range(total_days)
    }

    work_orders = WorkOrder.objects.filter(
        business=business,
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
        reservation__status__in=WorkOrder.operational_statuses(),
    )
    for order in work_orders:
        bucket = daily.get(series_local_day(order.created_at))
        if bucket is not None:
            bucket["billed_total"] += order.total_amount or ZERO

    payments = Payment.objects.filter(
        business=business,
        paid_at__date__gte=date_from,
        paid_at__date__lte=date_to,
    )
    for payment in payments:
        bucket = daily.get(series_local_day(payment.paid_at))
        if bucket is not None:
            bucket["collected_total"] += payment.amount or ZERO

    for consumption in MaterialConsumption.objects.filter(
        business=business,
        consumed_at__gte=date_from,
        consumed_at__lte=date_to,
    ):
        bucket = daily.get(series_local_day(consumption.consumed_at))
        if bucket is not None:
            bucket["material_cost_total"] += consumption.estimated_total_cost or ZERO

    for line in StockMovementLine.objects.filter(
        movement__movement_type=StockMovement.MovementType.CONSUMPTION,
        movement__business=business,
        movement__occurred_on__gte=date_from,
        movement__occurred_on__lte=date_to,
    ).select_related("movement"):
        bucket = daily.get(series_local_day(line.movement.occurred_on))
        if bucket is not None:
            bucket["material_cost_total"] += line.estimated_total_cost or ZERO

    movements = CashMovement.objects.select_related(
        "payment",
        "material_purchase",
        "stock_movement",
        "debt",
    ).filter(
        business=business,
        occurred_at__date__gte=date_from,
        occurred_at__date__lte=date_to,
    )
    for movement in movements:
        if not cash_movement_cashflow_effect(movement):
            continue
        bucket = daily.get(series_local_day(movement.occurred_at))
        if bucket is None:
            continue
        if movement.movement_type == CashMovement.MovementType.INCOME:
            bucket["cashflow_income_total"] += movement.amount
        elif movement.movement_type == CashMovement.MovementType.EXPENSE:
            bucket["cashflow_expense_total"] += movement.amount

    for debt_payment in DebtPayment.objects.filter(
        business=business,
        paid_at__gte=date_from,
        paid_at__lte=date_to,
    ):
        bucket = daily.get(series_local_day(debt_payment.paid_at))
        if bucket is not None:
            bucket["cashflow_expense_total"] += debt_payment.amount or ZERO

    ordered_days = sorted(daily.keys())

    if total_days <= SERIES_DAILY_MAX_DAYS:
        return {
            "interval": "day",
            "from": date_from.isoformat(),
            "to": date_to.isoformat(),
            "points": [series_point(day, daily[day]) for day in ordered_days],
        }

    weekly = {}
    weekly_order = []
    for day in ordered_days:
        week_index = (day - date_from).days // 7
        bucket = weekly.get(week_index)
        if bucket is None:
            bucket = {"date": day, **{key: ZERO for key in SERIES_FLOW_KEYS}}
            weekly[week_index] = bucket
            weekly_order.append(week_index)
        for key in SERIES_FLOW_KEYS:
            bucket[key] += daily[day][key]

    return {
        "interval": "week",
        "from": date_from.isoformat(),
        "to": date_to.isoformat(),
        "points": [series_point(weekly[idx]["date"], weekly[idx]) for idx in weekly_order],
    }


def dashboard_summary_has_activity(summary):
    activity_fields = [
        "billed_total",
        "collected_total",
        "balance_due_total",
        "material_cost_total",
        "material_purchases_total",
        "cashflow_income_total",
        "cashflow_expense_total",
    ]
    return summary["work_orders_count"] > 0 or any(summary[field] != ZERO for field in activity_fields)


def count_text(count, singular, plural):
    return f"{count} {singular if count == 1 else plural}"


def economic_alerts_for(summary, debt_summary):
    alerts = []
    if summary["balance_due_total"] > ZERO:
        alerts.append(
            {
                "id": "receivables",
                "severity": "warning",
                "title": "Facturado sin cobrar",
                "detail": f"{count_text(summary['work_orders_with_balance_due_count'], 'trabajo', 'trabajos')} con saldo pendiente",
                "amount": summary["balance_due_total"],
                "count": summary["work_orders_with_balance_due_count"],
                "action_section": "cash",
                "action_label": "Cobrar trabajos",
            }
        )
    if debt_summary["overdue_debts_total"] > ZERO:
        alerts.append(
            {
                "id": "overdue_debts",
                "severity": "danger",
                "title": "Deudas vencidas",
                "detail": f"{count_text(debt_summary['overdue_debts_count'], 'deuda vencida', 'deudas vencidas')} pendiente",
                "amount": debt_summary["overdue_debts_total"],
                "count": debt_summary["overdue_debts_count"],
                "action_section": "debts",
                "action_label": "Ver deudas",
            }
        )
    due_soon = debt_summary["debt_timing"]["due_soon"]
    if due_soon["amount"] > ZERO:
        alerts.append(
            {
                "id": "due_soon_debts",
                "severity": "warning",
                "title": "Deudas por vencer",
                "detail": f"{count_text(due_soon['count'], 'deuda vence', 'deudas vencen')} en {debt_summary['debt_timing']['due_soon_days']} dias",
                "amount": due_soon["amount"],
                "count": due_soon["count"],
                "action_section": "debts",
                "action_label": "Planificar pago",
            }
        )
    if summary["estimated_margin_total"] < ZERO:
        alerts.append(
            {
                "id": "negative_margin",
                "severity": "danger",
                "title": "Margen estimado negativo",
                "detail": "Los costos imputados superan lo facturado en el periodo",
                "amount": summary["estimated_margin_total"],
                "count": summary["work_orders_count"],
                "action_section": "inventory",
                "action_label": "Revisar costos",
            }
        )
    if summary["cashflow_balance"] < ZERO:
        alerts.append(
            {
                "id": "negative_cashflow",
                "severity": "warning",
                "title": "Caja real negativa",
                "detail": "Los egresos de caja superan los ingresos del periodo",
                "amount": summary["cashflow_balance"],
                "count": 1,
                "action_section": "cash",
                "action_label": "Ver caja",
            }
        )
    return alerts


def previous_period_for(date_from, date_to):
    period_days = (date_to - date_from).days + 1
    previous_to = date_from - timedelta(days=1)
    previous_from = previous_to - timedelta(days=period_days - 1)
    return previous_from, previous_to


def debt_row(debt, balance_due, today):
    row = {
        "id": debt.id,
        "concept": debt.concept,
        "creditor": debt.supplier.name if debt.supplier_id else debt.creditor,
        "due_date": debt.due_date.isoformat() if debt.due_date else None,
        "principal_amount": debt.principal_amount,
        "paid_total": debt.total_paid_amount,
        "balance_due": balance_due,
    }
    if debt.due_date and debt.due_date < today:
        row["days_overdue"] = (today - debt.due_date).days
    elif debt.due_date:
        row["days_until_due"] = (debt.due_date - today).days
    return row


def debt_timing_summary(business, today):
    due_soon_days = 7
    debts = Debt.objects.filter(business=business).select_related("supplier").annotate(
        total_paid_amount=Coalesce(
            Sum("payments__amount"),
            Value(ZERO),
            output_field=MONEY_FIELD,
        )
    )
    overdue = {"amount": ZERO, "count": 0, "debts": []}
    due_soon = {"amount": ZERO, "count": 0, "debts": []}
    without_due_date = {"amount": ZERO, "count": 0, "debts": []}
    open_debts_total = ZERO
    open_debts_count = 0
    due_soon_until = today + timedelta(days=due_soon_days)
    for debt in debts:
        balance_due = max(debt.principal_amount - debt.total_paid_amount, ZERO)
        if balance_due <= ZERO:
            continue
        open_debts_total += balance_due
        open_debts_count += 1
        row = debt_row(debt, balance_due, today)
        if not debt.due_date:
            bucket = without_due_date
        elif debt.due_date < today:
            bucket = overdue
        elif debt.due_date <= due_soon_until:
            bucket = due_soon
        else:
            continue
        bucket["amount"] += balance_due
        bucket["count"] += 1
        bucket["debts"].append(row)
    overdue["debts"].sort(key=lambda item: item.get("days_overdue", 0), reverse=True)
    due_soon["debts"].sort(key=lambda item: item.get("days_until_due", 999999))
    return {
        "overdue_debts_total": overdue["amount"],
        "overdue_debts_count": overdue["count"],
        "open_debts_total": open_debts_total,
        "open_debts_count": open_debts_count,
        "debt_timing": {
            "as_of": today.isoformat(),
            "due_soon_days": due_soon_days,
            "overdue": {**overdue, "debts": overdue["debts"][:5]},
            "due_soon": {**due_soon, "debts": due_soon["debts"][:5]},
            "without_due_date": {**without_due_date, "debts": without_due_date["debts"][:5]},
        },
    }


def margin_basis():
    return {
        "mode": "materials_only",
        "label": "Margen estimado por materiales",
        "included_costs": ["Materiales consumidos imputados a trabajos"],
        "excluded_costs": ["Mano de obra", "Gastos fijos", "Impuestos", "Comisiones no registradas"],
        "detail": "No es utilidad contable final; separa facturado menos materiales imputados.",
    }


def comparison_delta_percent(current, previous):
    if previous == ZERO:
        return None
    return ((current - previous) / abs(previous) * Decimal("100.00")).quantize(Decimal("0.01"))


def comparison_for(summary, previous_summary, previous_has_activity):
    comparison = {}
    for key, label, polarity in COMPARISON_METRICS:
        current = summary[key]
        previous = previous_summary[key]
        comparison[key] = {
            "label": label,
            "current": current,
            "previous": previous,
            "delta": current - previous,
            "delta_percent": comparison_delta_percent(current, previous),
            "polarity": polarity,
            "has_previous_activity": previous_has_activity,
        }
    return comparison


def cost_breakdown_for(summary):
    return {
        "billed_total": summary["billed_total"],
        "collected_total": summary["collected_total"],
        "balance_due_total": summary["balance_due_total"],
        "material_cost_total": summary["material_cost_total"],
        "material_purchases_total": summary["material_purchases_total"],
        "cashflow_income_total": summary["cashflow_income_total"],
        "cashflow_expense_total": summary["cashflow_expense_total"],
        "cashflow_balance": summary["cashflow_balance"],
    }


def data_quality_for(current_has_activity, previous_has_activity):
    return {
        "state": "ready" if current_has_activity else "empty",
        "has_current_activity": current_has_activity,
        "has_previous_activity": previous_has_activity,
        "message": ""
        if current_has_activity
        else "No hay trabajos, pagos ni movimientos economicos en el periodo.",
    }


def economic_insights_for(summary, previous_summary, previous_has_activity):
    insights = []
    if summary["balance_due_total"] > ZERO:
        insights.append(
            {
                "id": "collection_gap",
                "severity": "warning",
                "title": "Brecha de cobranza",
                "detail": f"{count_text(summary['work_orders_with_balance_due_count'], 'trabajo facturado aun no entro a caja', 'trabajos facturados aun no entraron a caja')}.",
                "amount": summary["balance_due_total"],
                "action_section": "cash",
            }
        )
    if dashboard_summary_has_activity(summary):
        insights.append(
            {
                "id": "cash_vs_economic",
                "severity": "info",
                "title": "Caja y facturacion no son lo mismo",
                "detail": "Caja real usa cobros y egresos pagados; facturado muestra trabajos del periodo aunque quede saldo pendiente.",
                "amount": summary["cashflow_balance"],
                "action_section": "cash",
            }
        )
        insights.append(
            {
                "id": "margin_basis",
                "severity": "info",
                "title": "Margen estimado material",
                "detail": "El margen descuenta solo materiales imputados; no incluye mano de obra ni gastos fijos.",
                "amount": summary["estimated_margin_total"],
                "action_section": "inventory",
            }
        )
    if not previous_has_activity and dashboard_summary_has_activity(summary):
        insights.append(
            {
                "id": "no_previous_period",
                "severity": "info",
                "title": "Sin base previa comparable",
                "detail": "La variacion contra periodo anterior puede aparecer como nueva actividad.",
                "amount": summary["billed_total"] - previous_summary["billed_total"],
                "action_section": None,
            }
        )
    return insights


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = date.today()
        business = business_from_request(request)
        date_from = parse_day(request.query_params.get("from"), today.replace(day=1))
        date_to = parse_day(request.query_params.get("to"), today)
        birthday_alert_days = 3
        birthday_alerts = upcoming_birthday_customers(
            Customer.objects.filter(
                business=business,
                is_active=True,
                birthday_month__isnull=False,
                birthday_day__isnull=False,
            ),
            days=birthday_alert_days,
        )
        payload = {
            "from": date_from.isoformat(),
            "to": date_to.isoformat(),
            "birthday_alert_days": birthday_alert_days,
            "birthday_alerts": CustomerSerializer(
                birthday_alerts,
                many=True,
                context={"request": request},
            ).data,
        }

        if not can_view_economy(request.user):
            return Response(payload)

        summary = dashboard_period_summary(business, date_from, date_to)
        previous_from, previous_to = previous_period_for(date_from, date_to)
        previous_summary = dashboard_period_summary(
            business, previous_from, previous_to, with_rankings=False
        )
        debt_summary = debt_timing_summary(business, today)
        current_has_activity = dashboard_summary_has_activity(summary)
        previous_has_activity = dashboard_summary_has_activity(previous_summary)
        work_orders = WorkOrder.objects.filter(
            business=business,
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
            reservation__status__in=WorkOrder.operational_statuses(),
        )
        work_orders_count = summary["work_orders_count"]
        average_ticket = summary["billed_total"] / work_orders_count if work_orders_count else ZERO
        by_status = {
            row["reservation__status"]: row["count"]
            for row in work_orders.values("reservation__status").annotate(count=Count("id"))
        }
        # Un solo aggregate condicional en lugar de dos queries separadas.
        today_totals = CashMovement.objects.filter(
            business=business, occurred_at__date=today
        ).aggregate(
            income=Sum("amount", filter=Q(movement_type=CashMovement.MovementType.INCOME)),
            expense=Sum("amount", filter=Q(movement_type=CashMovement.MovementType.EXPENSE)),
        )
        today_income = today_totals["income"] or Decimal("0.00")
        today_expense = today_totals["expense"] or Decimal("0.00")

        payload.update(
            {
                "sales_total": summary["collected_total"],
                "billed_total": summary["billed_total"],
                "collected_total": summary["collected_total"],
                "balance_due_total": summary["balance_due_total"],
                "work_orders_with_balance_due_count": summary["work_orders_with_balance_due_count"],
                "work_orders_count": work_orders_count,
                "average_ticket": average_ticket,
                "work_orders_by_status": by_status,
                "today_income": today_income,
                "today_expense": today_expense,
                "today_balance": today_income - today_expense,
                "material_purchases_total": summary["material_purchases_total"],
                "material_consumption_estimated": summary["material_cost_total"],
                "material_cost_total": summary["material_cost_total"],
                "estimated_margin_total": summary["estimated_margin_total"],
                "has_activity": current_has_activity or debt_summary["open_debts_count"] > 0,
                "top_receivables": summary["top_receivables"],
                "receivables_aging": summary["receivables_aging"],
                "economic_alerts": economic_alerts_for(summary, debt_summary),
                "economic_insights": economic_insights_for(
                    summary,
                    previous_summary,
                    previous_has_activity,
                ),
                "cashflow_income_total": summary["cashflow_income_total"],
                "cashflow_expense_total": summary["cashflow_expense_total"],
                "cashflow_balance": summary["cashflow_balance"],
                "fixed_expenses_pending_total": summary["fixed_expenses_pending_total"],
                "fixed_expenses_pending_count": summary["fixed_expenses_pending_count"],
                "margin_basis": margin_basis(),
                "cost_breakdown": cost_breakdown_for(summary),
                "comparison": comparison_for(summary, previous_summary, previous_has_activity),
                "rankings": summary["rankings"],
                "series": dashboard_period_series(business, date_from, date_to),
                "cash_by_category": cash_by_category_for_period(business, date_from, date_to),
                "data_quality": data_quality_for(current_has_activity, previous_has_activity),
                **debt_summary,
                "previous_period": {
                    "from": previous_from.isoformat(),
                    "to": previous_to.isoformat(),
                    "has_activity": previous_has_activity,
                    "billed_total": previous_summary["billed_total"],
                    "collected_total": previous_summary["collected_total"],
                    "balance_due_total": previous_summary["balance_due_total"],
                    "material_cost_total": previous_summary["material_cost_total"],
                    "estimated_margin_total": previous_summary["estimated_margin_total"],
                    "cashflow_balance": previous_summary["cashflow_balance"],
                },
            }
        )
        return Response(payload)
