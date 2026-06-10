"""Materializacion de gastos fijos en egresos reales de caja.

Cada plantilla `FixedExpense` genera una `FixedExpenseOccurrence` por periodo
vencido hasta hoy. Si la plantilla tiene `auto_pay`, la ocurrencia se registra
pagada creando un `CashMovement` real de egreso; si no, queda pendiente hasta
que el usuario registre el pago (`register_occurrence_payment`).

La generacion es idempotente: `last_generated_for`/`cycles_generated` actuan de
sentinela y `select_for_update` evita duplicados en requests concurrentes. Si el
periodo cae en un dia de caja cerrado, el egreso se registra como ajuste
(`adjusts_closed_day`) en lugar de saltarse.
"""

from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.utils import timezone

from core.models import register_expense_classification
from finance.cash import is_cash_day_closed
from finance.models import CashMovement

from .models import FixedExpense, FixedExpenseOccurrence, PaymentMethod


def add_months(reference: date, months: int) -> date:
    month = reference.month - 1 + months
    year = reference.year + month // 12
    month = month % 12 + 1
    day = min(reference.day, _last_day_of_month(year, month))
    return date(year, month, day)


def _last_day_of_month(year: int, month: int) -> int:
    if month == 12:
        return 31
    return (date(year, month + 1, 1) - timedelta(days=1)).day


def advance_date(reference: date, plan: FixedExpense) -> date:
    count = max(plan.interval_count, 1)
    if plan.interval_unit == FixedExpense.IntervalUnit.WEEKS:
        return reference + timedelta(weeks=count)
    return add_months(reference, count)


def next_occurrence(plan: FixedExpense) -> date | None:
    if not plan.is_active:
        return None
    if plan.max_cycles is not None and plan.cycles_generated >= plan.max_cycles:
        return None
    if plan.last_generated_for is None:
        candidate = plan.start_date
    else:
        candidate = advance_date(plan.last_generated_for, plan)
    if plan.end_date and candidate > plan.end_date:
        return None
    return candidate


def due_date_for(plan: FixedExpense, origin: date) -> date | None:
    if not plan.due_offset_days:
        return None
    return origin + timedelta(days=plan.due_offset_days)


def occurrence_datetime(day: date):
    return timezone.make_aware(datetime.combine(day, time.min))


def _build_occurrence(plan: FixedExpense, origin: date) -> FixedExpenseOccurrence:
    return FixedExpenseOccurrence(
        business=plan.business,
        fixed_expense=plan,
        period_date=origin,
        due_date=due_date_for(plan, origin),
        amount=plan.amount,
        expense_category=plan.expense_category or "Servicios",
        expense_subcategory=plan.expense_subcategory or "Otros",
        method=plan.payment_method,
    )


def _settle_occurrence(occurrence: FixedExpenseOccurrence, *, method, paid_at, user=None) -> CashMovement:
    category = occurrence.expense_category or "Servicios"
    subcategory = occurrence.expense_subcategory or "Otros"
    kwargs = {
        "business": occurrence.business,
        "movement_type": CashMovement.MovementType.EXPENSE,
        "category": category,
        "subcategory": subcategory,
        "amount": occurrence.amount,
        "occurred_at": occurrence_datetime(occurrence.period_date),
        "description": f"Gasto fijo: {occurrence.fixed_expense.concept}",
    }
    if is_cash_day_closed(occurrence.period_date, business=occurrence.business):
        kwargs["adjusts_closed_day"] = occurrence.period_date
    movement = CashMovement.objects.create(created_by=user, **kwargs)
    register_expense_classification(category, subcategory, business=occurrence.business)
    occurrence.cash_movement = movement
    occurrence.status = FixedExpenseOccurrence.Status.PAID
    occurrence.method = method
    occurrence.paid_at = paid_at
    occurrence.save(
        update_fields=["cash_movement", "status", "method", "paid_at", "updated_at"]
    )
    return movement


def register_occurrence_payment(occurrence, *, user=None, method=None, paid_at=None):
    """Registra el pago manual de una ocurrencia pendiente (idempotente)."""
    if occurrence.status == FixedExpenseOccurrence.Status.PAID or occurrence.cash_movement_id:
        return occurrence.cash_movement
    method = method or occurrence.method or PaymentMethod.TRANSFER
    paid_at = paid_at or occurrence.period_date
    with transaction.atomic():
        return _settle_occurrence(occurrence, method=method, paid_at=paid_at, user=user)


def materialize_due(business=None, today: date | None = None, user=None) -> int:
    today = today or timezone.localdate()
    queryset = FixedExpense.objects.filter(is_active=True)
    if business is not None:
        queryset = queryset.filter(business=business)
    plan_ids = list(queryset.values_list("id", flat=True))
    created = 0
    for plan_id in plan_ids:
        created += _materialize_plan(plan_id, today=today, user=user)
    return created


def _materialize_plan(plan_id: int, today: date, user=None) -> int:
    created = 0
    with transaction.atomic():
        plan = (
            FixedExpense.objects.select_for_update()
            .filter(pk=plan_id, is_active=True)
            .first()
        )
        if plan is None:
            return created
        guard = 0
        while True:
            guard += 1
            if guard > 366:
                break
            candidate = next_occurrence(plan)
            if candidate is None or candidate > today:
                break
            occurrence = _build_occurrence(plan, candidate)
            occurrence.save()
            if plan.auto_pay:
                _settle_occurrence(
                    occurrence,
                    method=plan.payment_method,
                    paid_at=candidate,
                    user=user,
                )
            plan.last_generated_for = candidate
            plan.cycles_generated += 1
            plan.save(
                update_fields=["last_generated_for", "cycles_generated", "updated_at"]
            )
            created += 1
    return created
