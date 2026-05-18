from datetime import date
from decimal import Decimal

from django.db.models import Count, Sum
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import business_from_request, can_view_economy

from customers.birthdays import upcoming_birthday_customers
from customers.models import Customer
from customers.serializers import CustomerSerializer
from finance.models import CashMovement, Payment
from inventory.models import MaterialConsumption, MaterialPurchase, StockMovement, StockMovementLine
from workorders.models import WorkOrder


def parse_day(value, fallback):
    return date.fromisoformat(value) if value else fallback


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

        payments = Payment.objects.filter(business=business, paid_at__date__gte=date_from, paid_at__date__lte=date_to)
        work_orders = WorkOrder.objects.filter(
            business=business,
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
            reservation__status__in=WorkOrder.operational_statuses(),
        )
        purchases = MaterialPurchase.objects.filter(business=business, purchased_at__gte=date_from, purchased_at__lte=date_to)
        consumptions = MaterialConsumption.objects.filter(business=business, consumed_at__gte=date_from, consumed_at__lte=date_to)
        stock_purchases = StockMovement.objects.filter(
            business=business,
            movement_type=StockMovement.MovementType.PURCHASE,
            occurred_on__gte=date_from,
            occurred_on__lte=date_to,
        )
        stock_consumptions = StockMovementLine.objects.filter(
            movement__movement_type=StockMovement.MovementType.CONSUMPTION,
            movement__business=business,
            movement__occurred_on__gte=date_from,
            movement__occurred_on__lte=date_to,
        )

        sales_total = payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        work_orders_count = work_orders.count()
        average_ticket = sales_total / work_orders_count if work_orders_count else Decimal("0.00")
        by_status = {
            row["reservation__status"]: row["count"]
            for row in work_orders.values("reservation__status").annotate(count=Count("id"))
        }
        today_movements = CashMovement.objects.filter(business=business, occurred_at__date=today)
        today_income = (
            today_movements.filter(movement_type=CashMovement.MovementType.INCOME).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )
        today_expense = (
            today_movements.filter(movement_type=CashMovement.MovementType.EXPENSE).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        payload.update(
            {
                "sales_total": sales_total,
                "work_orders_count": work_orders_count,
                "average_ticket": average_ticket,
                "work_orders_by_status": by_status,
                "today_income": today_income,
                "today_expense": today_expense,
                "today_balance": today_income - today_expense,
                "material_purchases_total": (
                    (purchases.aggregate(total=Sum("total_cost"))["total"] or Decimal("0.00"))
                    + (stock_purchases.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00"))
                ),
                "material_consumption_estimated": (
                    (consumptions.aggregate(total=Sum("estimated_total_cost"))["total"] or Decimal("0.00"))
                    + (stock_consumptions.aggregate(total=Sum("estimated_total_cost"))["total"] or Decimal("0.00"))
                ),
            }
        )
        return Response(payload)
