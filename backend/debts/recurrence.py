from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from finance.cash import is_cash_day_closed

from .models import Debt, DebtPayment, RecurringDebt


@dataclass
class SkippedPeriod:
    plan_id: int
    plan_concept: str
    period_date: date
    reason: str


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


def advance_date(reference: date, plan: RecurringDebt) -> date:
    count = max(plan.interval_count, 1)
    if plan.interval_unit == RecurringDebt.IntervalUnit.DAYS:
        return reference + timedelta(days=count)
    if plan.interval_unit == RecurringDebt.IntervalUnit.WEEKS:
        return reference + timedelta(weeks=count)
    return add_months(reference, count)


def next_occurrence(plan: RecurringDebt) -> date | None:
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


def due_date_for(plan: RecurringDebt, origin: date) -> date | None:
    if not plan.due_offset_days:
        return None
    return origin + timedelta(days=plan.due_offset_days)


def _build_debt_kwargs(plan: RecurringDebt, origin: date) -> dict:
    return {
        "business": plan.business,
        "concept": plan.concept,
        "creditor": plan.creditor,
        "supplier": plan.supplier,
        "principal_amount": plan.principal_amount,
        "origin_date": origin,
        "due_date": due_date_for(plan, origin),
        "expense_category": plan.expense_category or "Servicios",
        "expense_subcategory": plan.expense_subcategory or "Otros",
        "notes": plan.notes,
        "recurring_source": plan,
    }


def _generate_debt(plan: RecurringDebt, origin: date, user=None) -> Debt:
    from .serializers import sync_debt_cash_movement

    debt = Debt.objects.create(**_build_debt_kwargs(plan, origin))
    sync_debt_cash_movement(debt, user=user)
    if plan.auto_settle:
        DebtPayment.objects.create(
            business=plan.business,
            debt=debt,
            amount=plan.principal_amount,
            paid_at=origin,
            method=plan.auto_settle_method,
            notes="Pago automatico (debito).",
        )
    return debt


def materialize_due(business=None, today: date | None = None, user=None) -> list[SkippedPeriod]:
    today = today or timezone.localdate()
    skipped: list[SkippedPeriod] = []
    queryset = RecurringDebt.objects.filter(is_active=True)
    if business is not None:
        queryset = queryset.filter(business=business)
    plan_ids = list(queryset.values_list("id", flat=True))
    for plan_id in plan_ids:
        skipped.extend(_materialize_plan(plan_id, today=today, user=user))
    return skipped


def _materialize_plan(plan_id: int, today: date, user=None) -> list[SkippedPeriod]:
    skipped: list[SkippedPeriod] = []
    with transaction.atomic():
        plan = (
            RecurringDebt.objects.select_for_update()
            .filter(pk=plan_id, is_active=True)
            .first()
        )
        if plan is None:
            return skipped
        guard = 0
        while True:
            guard += 1
            if guard > 366:
                break
            candidate = next_occurrence(plan)
            if candidate is None or candidate > today:
                break
            if is_cash_day_closed(candidate, business=plan.business):
                skipped.append(
                    SkippedPeriod(
                        plan_id=plan.pk,
                        plan_concept=plan.concept,
                        period_date=candidate,
                        reason="cash_day_closed",
                    )
                )
                plan.last_generated_for = candidate
                plan.cycles_generated += 1
                plan.save(update_fields=["last_generated_for", "cycles_generated", "updated_at"])
                continue
            _generate_debt(plan, candidate, user=user)
            plan.last_generated_for = candidate
            plan.cycles_generated += 1
            plan.save(update_fields=["last_generated_for", "cycles_generated", "updated_at"])
    return skipped


def current_cycle_debt(plan: RecurringDebt) -> Debt | None:
    if plan.last_generated_for is None:
        return None
    return (
        plan.generated_debts.filter(origin_date=plan.last_generated_for)
        .order_by("-id")
        .first()
    )


def apply_template_to_current(plan: RecurringDebt) -> Debt | None:
    """Update the latest generated debt to reflect plan changes when it has no payments."""
    plan.refresh_from_db()
    debt = current_cycle_debt(plan)
    if debt is None or debt.payments.exists():
        return None
    debt.concept = plan.concept
    debt.creditor = plan.creditor
    debt.supplier = plan.supplier
    debt.principal_amount = plan.principal_amount
    debt.expense_category = plan.expense_category or "Servicios"
    debt.expense_subcategory = plan.expense_subcategory or "Otros"
    debt.notes = plan.notes
    debt.due_date = due_date_for(plan, debt.origin_date)
    debt.save()
    from .serializers import sync_debt_cash_movement

    sync_debt_cash_movement(debt)
    return debt
