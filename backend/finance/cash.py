from datetime import date, datetime
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from .models import CashClosure, CashMovement


ZERO = Decimal("0.00")
CLOSED_DAY_MESSAGE = (
    "La caja del dia {day} esta cerrada. Registra un ajuste compensatorio en el dia actual."
)


def cash_day(value):
    if isinstance(value, datetime):
        if timezone.is_aware(value):
            return timezone.localtime(value).date()
        return value.date()
    if isinstance(value, date):
        return value
    return None


def is_cash_day_closed(day):
    return bool(day and CashClosure.objects.filter(day=day).exists())


def ensure_cash_day_open(day, field="date"):
    if is_cash_day_closed(day):
        raise serializers.ValidationError({field: CLOSED_DAY_MESSAGE.format(day=day.isoformat())})


def ensure_adjustment_target_closed(day, field="adjusts_closed_day"):
    if not day:
        return
    if not is_cash_day_closed(day):
        raise serializers.ValidationError({field: "El ajuste debe referenciar un dia de caja ya cerrado."})


def request_user_from_context(context):
    request = context.get("request") if context else None
    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        return user
    return None


def decimal_total(queryset):
    return queryset.aggregate(total=Sum("amount"))["total"] or ZERO


def totals_payload(income, expense):
    return {
        "income": income,
        "expense": expense,
        "balance": income - expense,
    }


def cash_movement_source_kind(movement):
    if movement.adjusts_closed_day:
        return "adjustment"
    if movement.payment_id:
        return "payment"
    if movement.material_purchase_id:
        return "material_purchase"
    if movement.stock_movement_id:
        stock_type = getattr(movement.stock_movement, "movement_type", "")
        if stock_type == "sale":
            return "stock_sale"
        if stock_type == "purchase":
            return "stock_purchase"
        return "stock_movement"
    if related_debt(movement):
        return "debt_origin"
    return "manual"


def related_debt(movement):
    try:
        return movement.debt
    except Exception:
        return None


def cash_movement_cashflow_effect(movement):
    return cash_movement_source_kind(movement) != "debt_origin"


def signed_amount_for(movement_type, amount):
    prefix = "+" if movement_type == CashMovement.MovementType.INCOME else "-"
    return f"{prefix}{Decimal(amount):.2f}"
