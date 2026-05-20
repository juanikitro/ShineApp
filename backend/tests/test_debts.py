from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.db.models import Sum
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from debts.models import Debt, DebtPayment
from debts.serializers import DebtPaymentSerializer, DebtSerializer
from finance.models import CashClosure
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


@pytest.mark.django_db
def test_debt_update_syncs_origin_movement_and_blocks_total_below_paid(api_client):
    create = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Compresor",
            "principal_amount": "100000.00",
            "origin_date": "2026-05-07",
            "expense_category": "Herramientas",
            "expense_subcategory": "Equipamiento",
        },
        format="json",
    )
    assert create.status_code == 201, create.data
    debt = Debt.objects.get(pk=create.data["id"])
    DebtPayment.objects.create(
        debt=debt,
        amount=Decimal("20000.00"),
        paid_at=timezone.datetime(2026, 5, 9).date(),
        method="cash",
    )

    blocked = api_client.patch(
        reverse("debt-detail", args=[debt.id]),
        {"principal_amount": "10000.00"},
        format="json",
    )
    assert blocked.status_code == 400
    assert "principal_amount" in blocked.data

    updated = api_client.patch(
        reverse("debt-detail", args=[debt.id]),
        {
            "principal_amount": "130000.00",
            "expense_category": "Servicios",
            "expense_subcategory": "Tercerizados",
        },
        format="json",
    )
    assert updated.status_code == 200, updated.data
    debt.refresh_from_db()
    movement = debt.cash_movement
    assert movement.amount == Decimal("130000.00")
    assert movement.category == "Servicios"
    assert movement.subcategory == "Tercerizados"


@pytest.mark.django_db
def test_debt_destroy_contracts_for_payments_cash_closure_and_origin_movement(api_client):
    with_payment = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Maquina",
            "principal_amount": "50000.00",
            "origin_date": "2026-05-07",
        },
        format="json",
    )
    assert with_payment.status_code == 201, with_payment.data
    payment = api_client.post(
        reverse("debtpayment-list"),
        {
            "debt": with_payment.data["id"],
            "amount": "10000.00",
            "paid_at": "2026-05-08",
        },
        format="json",
    )
    assert payment.status_code == 201, payment.data
    blocked_paid = api_client.delete(reverse("debt-detail", args=[with_payment.data["id"]]))
    assert blocked_paid.status_code == 400
    assert "pagos registrados" in str(blocked_paid.data)

    closed = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Insumos",
            "principal_amount": "40000.00",
            "origin_date": "2026-05-09",
        },
        format="json",
    )
    assert closed.status_code == 201, closed.data
    closed_debt = Debt.objects.get(pk=closed.data["id"])
    CashClosure.objects.create(
        business=closed_debt.business,
        day=closed_debt.origin_date,
        total_income=0,
        total_expense=0,
        balance=0,
    )
    blocked_closed = api_client.delete(reverse("debt-detail", args=[closed_debt.id]))
    assert blocked_closed.status_code == 400
    assert "origin_date" in str(blocked_closed.data)

    removable = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Repuesto",
            "principal_amount": "25000.00",
            "origin_date": "2026-05-10",
        },
        format="json",
    )
    assert removable.status_code == 201, removable.data
    removable_debt = Debt.objects.get(pk=removable.data["id"])
    movement_id = removable_debt.cash_movement_id

    deleted = api_client.delete(reverse("debt-detail", args=[removable_debt.id]))
    assert deleted.status_code == 204
    assert not Debt.objects.filter(pk=removable_debt.id).exists()
    assert not CashMovement.objects.filter(pk=movement_id).exists()


@pytest.mark.django_db
def test_debt_serializers_reject_blank_categories_non_positive_amounts_and_overpayments(api_client):
    serializer = DebtSerializer(
        data={
            "concept": "Pulidora",
            "principal_amount": "0.00",
            "origin_date": "2026-05-07",
            "expense_category": " ",
            "expense_subcategory": "",
        }
    )
    assert not serializer.is_valid()
    assert "principal_amount" in serializer.errors
    assert "expense_category" in serializer.errors
    assert "expense_subcategory" in serializer.errors

    create = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Pulidora",
            "principal_amount": "120000.00",
            "origin_date": "2026-05-07",
        },
        format="json",
    )
    assert create.status_code == 201, create.data
    debt = Debt.objects.get(pk=create.data["id"])

    negative_payment = DebtPaymentSerializer(data={"debt": debt.id, "amount": "0.00", "paid_at": "2026-05-08"})
    assert not negative_payment.is_valid()
    assert "amount" in negative_payment.errors

    overpayment = DebtPaymentSerializer(
        data={"debt": debt.id, "amount": "130000.00", "paid_at": "2026-05-08"}
    )
    assert not overpayment.is_valid()
    assert "amount" in overpayment.errors


@pytest.mark.django_db
def test_debt_payment_destroy_respects_closed_cash_day(api_client):
    create = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Pulidora",
            "principal_amount": "120000.00",
            "origin_date": "2026-05-07",
        },
        format="json",
    )
    assert create.status_code == 201, create.data
    payment = api_client.post(
        reverse("debtpayment-list"),
        {
            "debt": create.data["id"],
            "amount": "40000.00",
            "paid_at": "2026-05-10",
        },
        format="json",
    )
    assert payment.status_code == 201, payment.data
    debt = Debt.objects.get(pk=create.data["id"])
    CashClosure.objects.create(
        business=debt.business,
        day=timezone.datetime(2026, 5, 10).date(),
        total_income=0,
        total_expense=0,
        balance=0,
    )

    response = api_client.delete(reverse("debtpayment-detail", args=[payment.data["id"]]))

    assert response.status_code == 400
    assert "paid_at" in str(response.data)
