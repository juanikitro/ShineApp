from decimal import Decimal

from django.db.models import Sum

from finance.models import Payment
from inventory.models import MaterialConsumption, StockMovement

ZERO = Decimal("0.00")


def build_work_order_financial_metrics(work_orders):
    rows = [work_order for work_order in work_orders if work_order is not None]
    work_order_ids = [work_order.id for work_order in rows if work_order.id]
    metrics = {
        work_order.id: {
            "paid_amount": ZERO,
            "balance_due": work_order.total_amount or ZERO,
            "material_cost": ZERO,
        }
        for work_order in rows
        if work_order.id
    }
    if not work_order_ids:
        return metrics

    payment_totals = (
        Payment.objects.filter(work_order_id__in=work_order_ids)
        .values("work_order_id")
        .annotate(total=Sum("amount"))
    )
    for row in payment_totals:
        metrics[row["work_order_id"]]["paid_amount"] = row["total"] or ZERO

    legacy_material_totals = (
        MaterialConsumption.objects.filter(work_order_id__in=work_order_ids)
        .values("work_order_id")
        .annotate(total=Sum("estimated_total_cost"))
    )
    for row in legacy_material_totals:
        metrics[row["work_order_id"]]["material_cost"] += row["total"] or ZERO

    stock_material_totals = (
        StockMovement.objects.filter(
            work_order_id__in=work_order_ids,
            movement_type=StockMovement.MovementType.CONSUMPTION,
        )
        .values("work_order_id")
        .annotate(total=Sum("lines__estimated_total_cost"))
    )
    for row in stock_material_totals:
        metrics[row["work_order_id"]]["material_cost"] += row["total"] or ZERO

    for work_order in rows:
        if not work_order.id:
            continue
        bucket = metrics[work_order.id]
        bucket["balance_due"] = max(
            (work_order.total_amount or ZERO) - bucket["paid_amount"],
            ZERO,
        )

    return metrics
