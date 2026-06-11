from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse

from finance.models import CashClosure, CashMovement
from fixed_expenses.materialization import (
    advance_date,
    materialize_due,
    next_occurrence,
    register_occurrence_payment,
)
from fixed_expenses.models import FixedExpense, FixedExpenseOccurrence
from fixed_expenses.serializers import FixedExpenseSerializer


def make_plan(business, **overrides):
    defaults = dict(
        business=business,
        concept="Internet",
        amount=Decimal("15000.00"),
        expense_category="Servicios",
        expense_subcategory="Internet",
        interval_unit=FixedExpense.IntervalUnit.MONTHS,
        interval_count=1,
        start_date=date(2026, 1, 15),
        is_active=True,
        auto_pay=False,
        payment_method="transfer",
    )
    defaults.update(overrides)
    return FixedExpense.objects.create(**defaults)


@pytest.mark.django_db
def test_advance_date_handles_weeks_and_months(default_business):
    weekly = make_plan(default_business, interval_unit="weeks", interval_count=1)
    biweekly = make_plan(default_business, interval_unit="weeks", interval_count=2)
    monthly = make_plan(default_business, interval_unit="months", interval_count=1)

    assert advance_date(date(2026, 1, 1), weekly) == date(2026, 1, 8)
    assert advance_date(date(2026, 1, 1), biweekly) == date(2026, 1, 15)
    assert advance_date(date(2026, 1, 31), monthly) == date(2026, 2, 28)


@pytest.mark.django_db
def test_next_occurrence_respects_end_date_and_max_cycles(default_business):
    plan = make_plan(default_business, start_date=date(2026, 1, 1), end_date=date(2026, 1, 1))
    plan.last_generated_for = date(2026, 1, 1)
    assert next_occurrence(plan) is None  # advancing past end_date

    capped = make_plan(default_business, max_cycles=1, cycles_generated=1)
    assert next_occurrence(capped) is None

    paused = make_plan(default_business, is_active=False)
    assert next_occurrence(paused) is None


@pytest.mark.django_db
def test_materialize_counts_monthly_weekly_and_biweekly(default_business):
    monthly = make_plan(default_business, start_date=date(2026, 1, 15))
    weekly = make_plan(default_business, interval_unit="weeks", start_date=date(2026, 1, 1))
    biweekly = make_plan(
        default_business, interval_unit="weeks", interval_count=2, start_date=date(2026, 1, 1)
    )

    materialize_due(business=default_business, today=date(2026, 2, 12))

    assert monthly.occurrences.count() == 1  # Jan15 (next is Feb15 > Feb12)
    assert weekly.occurrences.count() == 7  # Jan1, 8, 15, 22, 29, Feb5, Feb12
    assert biweekly.occurrences.count() == 4  # Jan1, Jan15, Jan29, Feb12


@pytest.mark.django_db
def test_materialize_is_idempotent(default_business):
    plan = make_plan(default_business, start_date=date(2026, 1, 1), max_cycles=3)
    first = materialize_due(business=default_business, today=date(2026, 6, 1))
    second = materialize_due(business=default_business, today=date(2026, 6, 1))

    assert first == 3
    assert second == 0
    assert plan.occurrences.count() == 3


@pytest.mark.django_db
def test_auto_pay_materializes_paid_occurrence_with_real_movement(default_business):
    plan = make_plan(
        default_business,
        start_date=date(2025, 3, 1),
        max_cycles=1,
        auto_pay=True,
        amount=Decimal("20000.00"),
        expense_category="Alquiler",
        expense_subcategory="Local",
        payment_method="transfer",
    )

    materialize_due(business=default_business, today=date(2025, 3, 1))

    occurrence = plan.occurrences.get()
    assert occurrence.status == FixedExpenseOccurrence.Status.PAID
    assert occurrence.paid_at == date(2025, 3, 1)
    movement = occurrence.cash_movement
    assert movement is not None
    assert movement.movement_type == CashMovement.MovementType.EXPENSE
    assert movement.category == "Alquiler"
    assert movement.subcategory == "Local"
    assert movement.amount == Decimal("20000.00")
    assert movement.occurred_at.date() == date(2025, 3, 1)
    assert movement.adjusts_closed_day is None


@pytest.mark.django_db
def test_manual_plan_materializes_pending_without_movement(default_business):
    plan = make_plan(default_business, start_date=date(2025, 3, 1), max_cycles=1, auto_pay=False)

    materialize_due(business=default_business, today=date(2025, 3, 1))

    occurrence = plan.occurrences.get()
    assert occurrence.status == FixedExpenseOccurrence.Status.PENDING
    assert occurrence.cash_movement is None
    assert CashMovement.objects.count() == 0


@pytest.mark.django_db
def test_closed_day_auto_pay_posts_adjustment_to_open_day(default_business):
    CashClosure.objects.create(
        business=default_business,
        day=date(2025, 3, 1),
        total_income=0,
        total_expense=0,
        balance=0,
    )
    plan = make_plan(default_business, start_date=date(2025, 3, 1), max_cycles=1, auto_pay=True)

    # materializamos "hoy" un dia posterior abierto: el ajuste se postea ahi
    materialize_due(business=default_business, today=date(2025, 4, 15))

    occurrence = plan.occurrences.get()
    assert occurrence.status == FixedExpenseOccurrence.Status.PAID
    movement = occurrence.cash_movement
    assert movement.occurred_at.date() == date(2025, 4, 15)  # posteado a dia abierto
    assert movement.adjusts_closed_day == date(2025, 3, 1)  # tag al periodo cerrado
    assert occurrence.paid_at == date(2025, 4, 15)


@pytest.mark.django_db
def test_end_date_and_max_cycles_stop_generation(default_business):
    limited = make_plan(default_business, start_date=date(2026, 1, 1), end_date=date(2026, 3, 1))
    materialize_due(business=default_business, today=date(2026, 12, 1))
    assert limited.occurrences.count() == 3  # Jan, Feb, Mar

    capped = make_plan(default_business, start_date=date(2026, 1, 1), max_cycles=2)
    materialize_due(business=default_business, today=date(2026, 12, 1))
    assert capped.occurrences.count() == 2


@pytest.mark.django_db
def test_pay_endpoint_settles_pending_and_is_idempotent(api_client, default_business):
    plan = make_plan(default_business, start_date=date(2025, 1, 1), max_cycles=1, auto_pay=False)
    materialize_due(business=default_business, today=date(2025, 1, 1))
    occurrence = plan.occurrences.get()

    response = api_client.post(
        reverse("fixedexpenseoccurrence-pay", args=[occurrence.id]),
        {"method": "cash", "paid_at": "2025-01-05"},
        format="json",
    )
    assert response.status_code == 200, response.data
    assert response.data["status"] == FixedExpenseOccurrence.Status.PAID

    occurrence.refresh_from_db()
    assert occurrence.cash_movement is not None
    assert occurrence.method == "cash"
    assert occurrence.paid_at == date(2025, 1, 5)
    assert CashMovement.objects.count() == 1

    again = api_client.post(reverse("fixedexpenseoccurrence-pay", args=[occurrence.id]), {}, format="json")
    assert again.status_code == 200
    assert CashMovement.objects.count() == 1  # no duplicate movement


@pytest.mark.django_db
def test_fixed_expense_list_triggers_materialization(api_client):
    create = api_client.post(
        reverse("fixedexpense-list"),
        {
            "concept": "Luz",
            "amount": "9000.00",
            "expense_category": "Servicios",
            "expense_subcategory": "Luz",
            "interval_unit": "months",
            "interval_count": 1,
            "start_date": "2020-01-01",
            "max_cycles": 2,
            "auto_pay": False,
            "payment_method": "transfer",
        },
        format="json",
    )
    assert create.status_code == 201, create.data
    assert create.data["next_occurrence"] == "2020-01-01"

    occurrences = api_client.get(reverse("fixedexpenseoccurrence-list"))
    assert occurrences.status_code == 200
    assert occurrences.data["count"] == 2


@pytest.mark.django_db
def test_pause_and_resume_toggle_generation(api_client, default_business):
    plan = make_plan(default_business, start_date=date(2026, 1, 1), max_cycles=6)

    pause = api_client.post(reverse("fixedexpense-pause", args=[plan.id]))
    assert pause.status_code == 200
    assert pause.data["is_active"] is False

    materialize_due(business=default_business, today=date(2026, 6, 1))
    assert plan.occurrences.count() == 0

    resume = api_client.post(reverse("fixedexpense-resume", args=[plan.id]))
    assert resume.status_code == 200
    assert resume.data["is_active"] is True

    materialize_due(business=default_business, today=date(2026, 6, 1))
    assert plan.occurrences.count() == 6


@pytest.mark.django_db
def test_create_validations_reject_bad_payloads(api_client, default_business):
    serializer = FixedExpenseSerializer(
        data={
            "concept": "Gas",
            "amount": "0.00",
            "expense_category": " ",
            "expense_subcategory": "",
            "interval_unit": "months",
            "interval_count": 0,
            "start_date": "2026-02-01",
        }
    )
    assert not serializer.is_valid()
    assert "amount" in serializer.errors
    assert "expense_category" in serializer.errors
    assert "expense_subcategory" in serializer.errors
    assert "interval_count" in serializer.errors

    bad_end = api_client.post(
        reverse("fixedexpense-list"),
        {
            "concept": "Gas",
            "amount": "8000.00",
            "expense_category": "Servicios",
            "expense_subcategory": "Gas",
            "interval_unit": "months",
            "interval_count": 1,
            "start_date": "2026-03-01",
            "end_date": "2026-02-01",
        },
        format="json",
    )
    assert bad_end.status_code == 400
    assert "end_date" in bad_end.data


@pytest.mark.django_db
def test_delete_plan_soft_deletes_and_keeps_paid_occurrences(api_client, default_business):
    plan = make_plan(default_business, start_date=date(2025, 1, 1), max_cycles=2, auto_pay=True)
    materialize_due(business=default_business, today=date(2025, 12, 1))
    assert plan.occurrences.count() == 2

    deleted = api_client.delete(reverse("fixedexpense-detail", args=[plan.id]))
    assert deleted.status_code == 204
    assert not FixedExpense.objects.filter(pk=plan.id).exists()  # hidden by soft-delete manager
    assert FixedExpense.all_objects.get(pk=plan.id).is_active is False
    assert FixedExpenseOccurrence.objects.filter(fixed_expense_id=plan.id).count() == 2


@pytest.mark.django_db
def test_dashboard_summary_includes_paid_fixed_expense(api_client, default_business):
    make_plan(
        default_business,
        start_date=date(2025, 1, 10),
        max_cycles=1,
        auto_pay=True,
        amount=Decimal("12345.00"),
    )
    materialize_due(business=default_business, today=date(2025, 1, 10))

    summary = api_client.get(
        reverse("dashboard-summary"), {"from": "2025-01-01", "to": "2025-01-31"}
    )
    assert summary.status_code == 200
    assert Decimal(summary.data["cashflow_expense_total"]) >= Decimal("12345.00")


@pytest.mark.django_db
def test_due_offset_days_sets_occurrence_due_date(default_business):
    plan = make_plan(
        default_business, start_date=date(2025, 1, 1), max_cycles=1, due_offset_days=10
    )
    materialize_due(business=default_business, today=date(2025, 1, 1))
    occurrence = plan.occurrences.get()
    assert occurrence.due_date == date(2025, 1, 11)


@pytest.mark.django_db
def test_occurrence_delete_soft_deletes_linked_movement(default_business):
    plan = make_plan(default_business, start_date=date(2025, 1, 1), max_cycles=1, auto_pay=True)
    materialize_due(business=default_business, today=date(2025, 1, 1))
    occurrence = plan.occurrences.get()
    movement_id = occurrence.cash_movement_id
    assert movement_id is not None

    occurrence.delete()

    assert not FixedExpenseOccurrence.objects.filter(pk=occurrence.id).exists()
    assert not CashMovement.objects.filter(pk=movement_id).exists()


@pytest.mark.django_db
def test_closed_day_adjustment_counts_in_settlement_period(api_client, default_business):
    CashClosure.objects.create(
        business=default_business,
        day=date(2025, 3, 1),
        total_income=0,
        total_expense=0,
        balance=0,
    )
    make_plan(
        default_business,
        start_date=date(2025, 3, 1),
        max_cycles=1,
        auto_pay=True,
        amount=Decimal("5000.00"),
    )
    materialize_due(business=default_business, today=date(2025, 4, 15))

    april = api_client.get(
        reverse("dashboard-summary"), {"from": "2025-04-01", "to": "2025-04-30"}
    )
    assert Decimal(april.data["cashflow_expense_total"]) >= Decimal("5000.00")

    # el dia cerrado de marzo no se altera: el ajuste cuenta en abril, no en marzo
    march = api_client.get(
        reverse("dashboard-summary"), {"from": "2025-03-01", "to": "2025-03-31"}
    )
    assert Decimal(march.data["cashflow_expense_total"]) == Decimal("0.00")


@pytest.mark.django_db
def test_unpay_reverts_occurrence_and_deletes_movement(api_client, default_business):
    plan = make_plan(default_business, start_date=date(2025, 1, 1), max_cycles=1, auto_pay=True)
    materialize_due(business=default_business, today=date(2025, 1, 1))
    occurrence = plan.occurrences.get()
    movement_id = occurrence.cash_movement_id
    assert movement_id is not None

    response = api_client.post(reverse("fixedexpenseoccurrence-unpay", args=[occurrence.id]))
    assert response.status_code == 200, response.data
    assert response.data["status"] == FixedExpenseOccurrence.Status.PENDING

    occurrence.refresh_from_db()
    assert occurrence.cash_movement is None
    assert occurrence.paid_at is None
    assert not CashMovement.objects.filter(pk=movement_id).exists()


@pytest.mark.django_db
def test_unpay_blocked_when_cash_day_closed(api_client, default_business):
    plan = make_plan(default_business, start_date=date(2025, 1, 10), max_cycles=1, auto_pay=True)
    materialize_due(business=default_business, today=date(2025, 1, 10))
    occurrence = plan.occurrences.get()
    CashClosure.objects.create(
        business=default_business,
        day=occurrence.cash_movement.occurred_at.date(),
        total_income=0,
        total_expense=0,
        balance=0,
    )

    response = api_client.post(reverse("fixedexpenseoccurrence-unpay", args=[occurrence.id]))
    assert response.status_code == 400

    occurrence.refresh_from_db()
    assert occurrence.status == FixedExpenseOccurrence.Status.PAID


@pytest.mark.django_db
def test_edit_propagates_amount_to_pending_occurrence(api_client, default_business):
    plan = make_plan(
        default_business,
        start_date=date(2025, 1, 1),
        max_cycles=1,
        auto_pay=False,
        amount=Decimal("10000.00"),
    )
    materialize_due(business=default_business, today=date(2025, 1, 1))
    occurrence = plan.occurrences.get()
    assert occurrence.amount == Decimal("10000.00")

    response = api_client.patch(
        reverse("fixedexpense-detail", args=[plan.id]),
        {"amount": "12500.00", "expense_subcategory": "Internet"},
        format="json",
    )
    assert response.status_code == 200, response.data

    occurrence.refresh_from_db()
    assert occurrence.amount == Decimal("12500.00")
    assert occurrence.expense_subcategory == "Internet"


@pytest.mark.django_db
def test_edit_does_not_touch_paid_occurrence(api_client, default_business):
    plan = make_plan(
        default_business,
        start_date=date(2025, 1, 1),
        max_cycles=1,
        auto_pay=True,
        amount=Decimal("10000.00"),
    )
    materialize_due(business=default_business, today=date(2025, 1, 1))
    occurrence = plan.occurrences.get()
    assert occurrence.status == FixedExpenseOccurrence.Status.PAID

    api_client.patch(
        reverse("fixedexpense-detail", args=[plan.id]),
        {"amount": "99999.00"},
        format="json",
    )
    occurrence.refresh_from_db()
    assert occurrence.amount == Decimal("10000.00")  # pagada: no se toca


@pytest.mark.django_db
def test_delete_removes_pending_keeps_paid(api_client, default_business):
    plan = make_plan(
        default_business, start_date=date(2025, 1, 1), max_cycles=2, auto_pay=False
    )
    materialize_due(business=default_business, today=date(2025, 12, 1))
    occurrences = list(plan.occurrences.all())
    assert len(occurrences) == 2

    register_occurrence_payment(occurrences[0])
    occurrences[0].refresh_from_db()
    assert occurrences[0].status == FixedExpenseOccurrence.Status.PAID

    deleted = api_client.delete(reverse("fixedexpense-detail", args=[plan.id]))
    assert deleted.status_code == 204

    remaining = FixedExpenseOccurrence.objects.filter(fixed_expense_id=plan.id)
    assert remaining.count() == 1
    assert remaining.get().status == FixedExpenseOccurrence.Status.PAID


@pytest.mark.django_db
def test_dashboard_pending_fixed_expenses_projection(api_client, default_business):
    make_plan(
        default_business,
        start_date=date(2025, 2, 1),
        max_cycles=1,
        auto_pay=False,
        amount=Decimal("8000.00"),
    )
    materialize_due(business=default_business, today=date(2025, 2, 1))

    summary = api_client.get(
        reverse("dashboard-summary"), {"from": "2025-02-01", "to": "2025-02-28"}
    )
    assert summary.status_code == 200
    assert Decimal(summary.data["fixed_expenses_pending_total"]) == Decimal("8000.00")
    assert summary.data["fixed_expenses_pending_count"] == 1
    # Pending must NOT affect cashflow (caja real = pagado)
    assert Decimal(summary.data["cashflow_expense_total"]) == Decimal("0.00")


@pytest.mark.django_db
def test_pay_endpoint_overrides_amount_when_provided(api_client, default_business):
    plan = make_plan(
        default_business,
        start_date=date(2025, 1, 1),
        max_cycles=1,
        auto_pay=False,
        amount=Decimal("15000.00"),
    )
    materialize_due(business=default_business, today=date(2025, 1, 1))
    occurrence = plan.occurrences.get()

    response = api_client.post(
        reverse("fixedexpenseoccurrence-pay", args=[occurrence.id]),
        {"method": "cash", "paid_at": "2025-01-05", "amount": "18500.00"},
        format="json",
    )
    assert response.status_code == 200, response.data
    assert Decimal(response.data["amount"]) == Decimal("18500.00")  # serializer refleja nuevo monto

    occurrence.refresh_from_db()
    assert occurrence.amount == Decimal("18500.00")
    assert occurrence.cash_movement is not None
    assert occurrence.cash_movement.amount == Decimal("18500.00")

    plan.refresh_from_db()
    assert plan.amount == Decimal("15000.00")  # plantilla no cambia


@pytest.mark.django_db
def test_pay_without_amount_preserves_occurrence_amount(api_client, default_business):
    plan = make_plan(
        default_business,
        start_date=date(2025, 1, 1),
        max_cycles=1,
        auto_pay=False,
        amount=Decimal("12000.00"),
    )
    materialize_due(business=default_business, today=date(2025, 1, 1))
    occurrence = plan.occurrences.get()

    response = api_client.post(
        reverse("fixedexpenseoccurrence-pay", args=[occurrence.id]),
        {"method": "cash", "paid_at": "2025-01-05"},
        format="json",
    )
    assert response.status_code == 200, response.data

    occurrence.refresh_from_db()
    assert occurrence.amount == Decimal("12000.00")
    assert occurrence.cash_movement.amount == Decimal("12000.00")
    assert Decimal(response.data["amount"]) == Decimal("12000.00")


@pytest.mark.django_db
def test_pay_endpoint_rejects_invalid_amount(api_client, default_business):
    plan = make_plan(default_business, start_date=date(2025, 1, 1), max_cycles=3, auto_pay=False)
    materialize_due(business=default_business, today=date(2025, 3, 1))
    occurrences = list(plan.occurrences.order_by("period_date"))

    for idx, bad_amount in enumerate(["0", "-100", "abc"]):
        response = api_client.post(
            reverse("fixedexpenseoccurrence-pay", args=[occurrences[idx].id]),
            {"amount": bad_amount},
            format="json",
        )
        assert response.status_code == 400, f"Expected 400 for amount={bad_amount!r}, got {response.status_code}"
        assert "amount" in response.data

        occurrences[idx].refresh_from_db()
        assert occurrences[idx].status == FixedExpenseOccurrence.Status.PENDING
        assert occurrences[idx].cash_movement_id is None
