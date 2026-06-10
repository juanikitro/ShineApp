from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from catalog.models import Service
from core.models import AuditLog, BusinessAccount, BusinessProfile
from customers.models import Customer, Vehicle
from debts.models import Debt, DebtPayment
from finance.models import CashClosure, CashMovement, Payment
from inventory.models import (
    Material,
    MaterialConsumption,
    MaterialOpenUnit,
    MaterialPurchase,
    StockMovement,
    StockMovementLine,
    Supplier,
    Tool,
)
from notifications.models import PublicRequest, PublicRequestItem
from quotes.models import Quote, QuoteItem
from scheduling.models import Reservation, ReservationItem
from workorders.models import WorkOrder


def run_seed_demo():
    call_command("seed_demo", stdout=StringIO())


@pytest.mark.django_db
def test_seed_demo_populates_realistic_dataset_across_modules():
    run_seed_demo()

    business = BusinessAccount.get_default()
    profile = BusinessProfile.get_solo(business=business)
    assert profile.name == "Shine Car Detail Studio"
    assert profile.subscription_type == BusinessProfile.SubscriptionType.PREMIUM
    assert profile.public_landing_enabled is True

    admin = get_user_model().objects.get(username="admin")
    employee = get_user_model().objects.get(username="empleado")
    receptionist = get_user_model().objects.get(username="recepcion")
    assert admin.check_password("admin123")
    assert employee.check_password("empleado123")
    assert receptionist.check_password("empleado123")
    assert admin.groups.filter(name="empleador").exists()
    assert employee.groups.filter(name="empleado").exists()

    assert Customer.objects.filter(business=business, is_active=True).count() >= 5
    assert Customer.objects.filter(business=business, is_active=False).exists()
    assert Vehicle.objects.filter(business=business, is_active=True).count() >= 5
    from catalog.models import Sector
    assert Service.objects.filter(business=business, sector__key="detailing").count() >= 3
    assert profile.enforce_capacity_limit is True
    assert Sector.objects.filter(business=business, key="detailing").values_list("default_capacity", flat=True).first() == 4
    assert Sector.objects.filter(business=business, key="lavadero").values_list("default_capacity", flat=True).first() == 8

    reservation_statuses = set(Reservation.objects.filter(business=business).values_list("status", flat=True))
    assert {
        Reservation.Status.PENDING,
        Reservation.Status.CONFIRMED,
        Reservation.Status.IN_PROGRESS,
        Reservation.Status.READY,
        Reservation.Status.DELIVERED,
        Reservation.Status.CANCELED,
    }.issubset(reservation_statuses)
    assert ReservationItem.objects.filter(reservation__business=business).count() > Reservation.objects.filter(business=business).count()
    assert WorkOrder.objects.filter(business=business).count() == Reservation.objects.filter(business=business).count()

    assert Payment.objects.filter(business=business).count() >= 5
    assert CashMovement.objects.filter(business=business, payment__isnull=False).count() >= 5
    assert CashMovement.objects.filter(business=business, movement_type=CashMovement.MovementType.EXPENSE).exists()
    assert CashClosure.objects.filter(business=business).exists()

    assert Material.objects.filter(business=business).count() >= 6
    assert Supplier.objects.filter(business=business).count() >= 3
    assert Tool.objects.filter(business=business).count() >= 5
    assert MaterialPurchase.objects.filter(business=business).exists()
    assert MaterialConsumption.objects.filter(business=business, open_unit__isnull=False).exists()
    assert MaterialOpenUnit.objects.filter(business=business, status=MaterialOpenUnit.Status.OPEN).exists()
    assert MaterialOpenUnit.objects.filter(business=business, status=MaterialOpenUnit.Status.FINISHED).exists()
    assert {
        StockMovement.MovementType.INITIAL_STOCK,
        StockMovement.MovementType.PURCHASE,
        StockMovement.MovementType.CONSUMPTION,
        StockMovement.MovementType.SALE,
    }.issubset(set(StockMovement.objects.filter(business=business).values_list("movement_type", flat=True)))
    assert StockMovementLine.objects.filter(movement__business=business).count() >= 8

    debt_statuses = {debt.status for debt in Debt.objects.filter(business=business)}
    assert {Debt.Status.OVERDUE, Debt.Status.PENDING, Debt.Status.PAID}.issubset(debt_statuses)
    assert DebtPayment.objects.filter(business=business).count() >= 2

    quote_statuses = set(Quote.objects.filter(business=business).values_list("status", flat=True))
    assert {Quote.Status.DRAFT, Quote.Status.SENT, Quote.Status.ACCEPTED, Quote.Status.REJECTED}.issubset(quote_statuses)
    assert QuoteItem.objects.filter(quote__business=business).count() >= 5

    request_statuses = set(PublicRequest.objects.filter(business=business).values_list("status", flat=True))
    assert {
        PublicRequest.Status.PENDING,
        PublicRequest.Status.CONVERTED,
        PublicRequest.Status.ARCHIVED,
    }.issubset(request_statuses)
    assert PublicRequestItem.objects.filter(public_request__business=business).count() >= 5
    assert AuditLog.objects.filter(business=business).count() >= 5


@pytest.mark.django_db
def test_seed_demo_is_idempotent_for_demo_records():
    run_seed_demo()
    first_counts = {
        "customers": Customer.objects.count(),
        "vehicles": Vehicle.objects.count(),
        "services": Service.objects.count(),
        "reservations": Reservation.objects.count(),
        "reservation_items": ReservationItem.objects.count(),
        "work_orders": WorkOrder.objects.count(),
        "payments": Payment.objects.count(),
        "cash_movements": CashMovement.objects.count(),
        "materials": Material.objects.count(),
        "suppliers": Supplier.objects.count(),
        "stock_movements": StockMovement.objects.count(),
        "stock_lines": StockMovementLine.objects.count(),
        "debts": Debt.objects.count(),
        "debt_payments": DebtPayment.objects.count(),
        "quotes": Quote.objects.count(),
        "quote_items": QuoteItem.objects.count(),
        "public_requests": PublicRequest.objects.count(),
        "public_request_items": PublicRequestItem.objects.count(),
        "audit_logs": AuditLog.objects.count(),
    }

    run_seed_demo()

    assert {
        "customers": Customer.objects.count(),
        "vehicles": Vehicle.objects.count(),
        "services": Service.objects.count(),
        "reservations": Reservation.objects.count(),
        "reservation_items": ReservationItem.objects.count(),
        "work_orders": WorkOrder.objects.count(),
        "payments": Payment.objects.count(),
        "cash_movements": CashMovement.objects.count(),
        "materials": Material.objects.count(),
        "suppliers": Supplier.objects.count(),
        "stock_movements": StockMovement.objects.count(),
        "stock_lines": StockMovementLine.objects.count(),
        "debts": Debt.objects.count(),
        "debt_payments": DebtPayment.objects.count(),
        "quotes": Quote.objects.count(),
        "quote_items": QuoteItem.objects.count(),
        "public_requests": PublicRequest.objects.count(),
        "public_request_items": PublicRequestItem.objects.count(),
        "audit_logs": AuditLog.objects.count(),
    } == first_counts
