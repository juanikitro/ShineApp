from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework.test import APIClient

from debts.models import Debt, DebtPayment, RecurringDebt
from debts.recurrence import (
    advance_date,
    apply_template_to_current,
    materialize_due,
    next_occurrence,
)
from finance.models import CashClosure, CashMovement


@pytest.fixture
def api_client(db, django_user_model):
    user = django_user_model.objects.create_user(username="admin", password="admin123")
    employer_group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(employer_group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _plan(**overrides):
    defaults = dict(
        concept="Alquiler",
        principal_amount=Decimal("250000.00"),
        interval_unit=RecurringDebt.IntervalUnit.MONTHS,
        interval_count=1,
        start_date=date(2026, 1, 5),
        due_offset_days=5,
        is_active=True,
    )
    defaults.update(overrides)
    return RecurringDebt.objects.create(**defaults)


@pytest.mark.django_db
def test_next_occurrence_uses_start_date_until_first_generation():
    plan = _plan()
    assert next_occurrence(plan) == date(2026, 1, 5)


@pytest.mark.django_db
def test_advance_date_handles_months_weeks_and_days():
    plan = _plan(interval_unit=RecurringDebt.IntervalUnit.DAYS, interval_count=7)
    assert advance_date(date(2026, 1, 1), plan) == date(2026, 1, 8)
    plan.interval_unit = RecurringDebt.IntervalUnit.WEEKS
    plan.interval_count = 2
    assert advance_date(date(2026, 1, 1), plan) == date(2026, 1, 15)
    plan.interval_unit = RecurringDebt.IntervalUnit.MONTHS
    plan.interval_count = 1
    assert advance_date(date(2026, 1, 31), plan) == date(2026, 2, 28)


@pytest.mark.django_db
def test_materialize_generates_missing_monthly_cycles():
    plan = _plan()
    skipped = materialize_due(today=date(2026, 3, 10))
    assert skipped == []
    debts = Debt.objects.filter(recurring_source=plan).order_by("origin_date")
    assert [d.origin_date for d in debts] == [
        date(2026, 1, 5),
        date(2026, 2, 5),
        date(2026, 3, 5),
    ]
    plan.refresh_from_db()
    assert plan.last_generated_for == date(2026, 3, 5)
    assert plan.cycles_generated == 3
    assert all(d.due_date == date(d.origin_date.year, d.origin_date.month, 10) for d in debts)


@pytest.mark.django_db
def test_materialize_is_idempotent_when_called_twice():
    plan = _plan()
    materialize_due(today=date(2026, 2, 10))
    materialize_due(today=date(2026, 2, 10))
    assert Debt.objects.filter(recurring_source=plan).count() == 2


@pytest.mark.django_db
def test_materialize_respects_end_date_and_max_cycles():
    plan = _plan(end_date=date(2026, 2, 5))
    materialize_due(today=date(2026, 6, 1))
    assert Debt.objects.filter(recurring_source=plan).count() == 2

    capped = _plan(concept="Suscripcion", max_cycles=2, start_date=date(2026, 1, 1))
    materialize_due(today=date(2026, 6, 1))
    assert Debt.objects.filter(recurring_source=capped).count() == 2


@pytest.mark.django_db
def test_materialize_skips_closed_cash_days_and_advances_pointer():
    plan = _plan()
    business = plan.business
    CashClosure.objects.create(
        business=business, day=date(2026, 1, 5), total_income=0, total_expense=0, balance=0
    )
    skipped = materialize_due(today=date(2026, 2, 10))
    assert len(skipped) == 1
    assert skipped[0].period_date == date(2026, 1, 5)
    assert skipped[0].reason == "cash_day_closed"
    assert Debt.objects.filter(recurring_source=plan, origin_date=date(2026, 1, 5)).count() == 0
    assert Debt.objects.filter(recurring_source=plan, origin_date=date(2026, 2, 5)).count() == 1
    plan.refresh_from_db()
    assert plan.last_generated_for == date(2026, 2, 5)


@pytest.mark.django_db
def test_auto_settle_generates_payment_for_full_amount():
    plan = _plan(
        concept="Abono Spotify",
        principal_amount=Decimal("3500.00"),
        auto_settle=True,
        auto_settle_method=RecurringDebt.PaymentMethod.TRANSFER,
        start_date=date(2026, 1, 1),
    )
    materialize_due(today=date(2026, 1, 1))
    debt = Debt.objects.get(recurring_source=plan)
    assert debt.balance_due == Decimal("0.00")
    payment = DebtPayment.objects.get(debt=debt)
    assert payment.amount == Decimal("3500.00")
    assert payment.method == RecurringDebt.PaymentMethod.TRANSFER
    assert payment.paid_at == date(2026, 1, 1)


@pytest.mark.django_db
def test_paused_plan_does_not_generate():
    plan = _plan(is_active=False)
    materialize_due(today=date(2026, 6, 1))
    assert Debt.objects.filter(recurring_source=plan).count() == 0


@pytest.mark.django_db
def test_apply_template_updates_current_cycle_when_no_payments():
    plan = _plan()
    materialize_due(today=date(2026, 1, 10))
    plan.principal_amount = Decimal("275000.00")
    plan.save(update_fields=["principal_amount", "updated_at"])
    updated = apply_template_to_current(plan)
    assert updated is not None
    assert updated.principal_amount == Decimal("275000.00")
    movement = CashMovement.objects.get(debt=updated)
    assert movement.amount == Decimal("275000.00")


@pytest.mark.django_db
def test_apply_template_skips_when_current_debt_has_payments():
    plan = _plan()
    materialize_due(today=date(2026, 1, 10))
    debt = Debt.objects.get(recurring_source=plan)
    DebtPayment.objects.create(
        business=debt.business, debt=debt, amount=Decimal("1000.00"), paid_at=debt.origin_date
    )
    plan.principal_amount = Decimal("999999.00")
    plan.save(update_fields=["principal_amount", "updated_at"])
    assert apply_template_to_current(plan) is None
    debt.refresh_from_db()
    assert debt.principal_amount == Decimal("250000.00")


@pytest.mark.django_db
def test_recurring_debt_endpoint_creates_pause_resume(api_client):
    create = api_client.post(
        reverse("recurringdebt-list"),
        {
            "concept": "Internet",
            "principal_amount": "9000.00",
            "interval_unit": "months",
            "interval_count": 1,
            "start_date": "2026-01-05",
            "due_offset_days": 5,
        },
        format="json",
    )
    assert create.status_code == 201, create.data
    plan_id = create.data["id"]

    pause = api_client.post(reverse("recurringdebt-pause", args=[plan_id]))
    assert pause.status_code == 200
    assert pause.data["is_active"] is False

    resume = api_client.post(reverse("recurringdebt-resume", args=[plan_id]))
    assert resume.status_code == 200
    assert resume.data["is_active"] is True


@pytest.mark.django_db
def test_debt_list_endpoint_materializes_and_surfaces_skipped(api_client):
    plan = _plan(start_date=date.today().replace(day=1))
    business = plan.business
    CashClosure.objects.create(
        business=business, day=plan.start_date, total_income=0, total_expense=0, balance=0
    )
    response = api_client.get(reverse("debt-list"))
    assert response.status_code == 200
    payload = response.data
    assert isinstance(payload, dict)
    assert "skipped_recurring_periods" in payload
    assert payload["skipped_recurring_periods"][0]["plan_id"] == plan.id
    assert payload["skipped_recurring_periods"][0]["reason"] == "cash_day_closed"


@pytest.mark.django_db
def test_recurring_serializer_rejects_invalid_dates_and_cycles(api_client):
    invalid_dates = api_client.post(
        reverse("recurringdebt-list"),
        {
            "concept": "Mala",
            "principal_amount": "100.00",
            "interval_unit": "months",
            "interval_count": 1,
            "start_date": "2026-06-01",
            "end_date": "2026-01-01",
            "due_offset_days": 0,
        },
        format="json",
    )
    assert invalid_dates.status_code == 400
    assert "end_date" in invalid_dates.data
