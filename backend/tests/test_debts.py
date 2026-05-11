from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.db.models import Sum
from django.urls import reverse
from rest_framework.test import APIClient

from debts.models import Debt, DebtPayment
from finance.models import CashMovement


@pytest.fixture
def api_client(db, django_user_model):
    user = django_user_model.objects.create_user(username="admin", password="admin123")
    employer_group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(employer_group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_debt_creation_registers_original_expense_and_exposes_balance(api_client):
    response = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Pulidora",
            "principal_amount": "120000.00",
            "origin_date": "2026-05-07",
            "due_date": "2026-06-15",
            "notes": "Compra financiada",
        },
        format="json",
    )

    assert response.status_code == 201
    debt = Debt.objects.get(pk=response.data["id"])
    assert debt.concept == "Pulidora"
    assert debt.total_paid == Decimal("0.00")
    assert debt.balance_due == Decimal("120000.00")
    assert debt.status == Debt.Status.PENDING
    assert Decimal(response.data["total_paid"]) == Decimal("0.00")
    assert Decimal(response.data["balance_due"]) == Decimal("120000.00")
    assert response.data["status"] == Debt.Status.PENDING
    assert response.data["expense_category"] == "Servicios"
    assert response.data["expense_subcategory"] == "Otros"

    movement = CashMovement.objects.get(debt=debt)
    assert movement.movement_type == CashMovement.MovementType.EXPENSE
    assert movement.category == "Servicios"
    assert movement.subcategory == "Otros"
    assert movement.amount == Decimal("120000.00")


@pytest.mark.django_db
def test_debt_partial_payment_updates_balance_without_duplicate_expense(api_client):
    debt_response = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Pulidora",
            "principal_amount": "120000.00",
            "origin_date": "2026-05-07",
        },
        format="json",
    )
    assert debt_response.status_code == 201

    payment_response = api_client.post(
        reverse("debtpayment-list"),
        {
            "debt": debt_response.data["id"],
            "amount": "40000.00",
            "paid_at": "2026-05-10",
            "method": "transfer",
            "notes": "Primer pago",
        },
        format="json",
    )

    assert payment_response.status_code == 201
    debt = Debt.objects.get(pk=debt_response.data["id"])
    assert DebtPayment.objects.filter(debt=debt).count() == 1
    assert debt.total_paid == Decimal("40000.00")
    assert debt.balance_due == Decimal("80000.00")
    assert debt.status == Debt.Status.PARTIAL
    assert Decimal(payment_response.data["debt_balance_due"]) == Decimal("80000.00")

    expenses = CashMovement.objects.filter(movement_type=CashMovement.MovementType.EXPENSE)
    assert expenses.count() == 1
    assert expenses.aggregate(total=Sum("amount"))["total"] == Decimal("120000.00")

    daily = api_client.get(reverse("cash-daily"), {"date": "2026-05-10"})
    assert daily.status_code == 200
    assert Decimal(daily.data["expense"]) == Decimal("0.00")

    original_day = api_client.get(reverse("cash-daily"), {"date": "2026-05-07"})
    assert original_day.status_code == 200
    assert Decimal(original_day.data["expense"]) == Decimal("120000.00")
    assert len(original_day.data["movements"]) == 1
    debt_movement = original_day.data["movements"][0]
    assert debt_movement["movement_type"] == CashMovement.MovementType.EXPENSE
    assert debt_movement["debt"] == debt.id
    assert debt_movement["debt_concept"] == "Pulidora"
