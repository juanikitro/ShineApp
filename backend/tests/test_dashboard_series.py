from datetime import date, datetime, time
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone

from catalog.models import Service
from core.models import BusinessAccount
from customers.models import Customer, Vehicle
from dashboard.views import dashboard_period_series, dashboard_period_summary
from finance.models import CashMovement, Payment
from inventory.models import Material, MaterialConsumption
from scheduling.models import Reservation

FLOW_METRICS = (
    "billed_total",
    "collected_total",
    "estimated_margin_total",
    "cashflow_balance",
)


def at(day, hour=12):
    return timezone.make_aware(datetime.combine(day, time(hour, 0)))


def make_order(customer, vehicle, service, *, total_amount, created_at):
    reservation = Reservation.objects.create(
        business=BusinessAccount.get_default(),
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=created_at.date(),
        # operational_statuses() on WorkOrder is [in_progress, ready, delivered];
        # the dashboard only counts work in those reservation states.
        status=Reservation.Status.DELIVERED,
    )
    order = reservation.work_order
    order.total_amount = total_amount
    order.created_at = created_at
    order.save(update_fields=["total_amount", "created_at"])
    return order


def base_catalog():
    customer = Customer.objects.create(name="Serie Cliente")
    vehicle = Vehicle.objects.create(customer=customer, brand="Ford", model="Focus")
    service = Service.objects.create(
        name="Lavado",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("10000.00"),
        estimated_duration_minutes=60,
    )
    return customer, vehicle, service


def metric_sum(series, metric):
    return sum((point[metric] for point in series["points"]), Decimal("0.00"))


@pytest.mark.django_db
def test_dashboard_series_daily_sums_match_period_totals():
    business = BusinessAccount.get_default()
    customer, vehicle, service = base_catalog()
    period_from = date(2026, 4, 1)
    period_to = date(2026, 4, 10)

    make_order(customer, vehicle, service, total_amount=Decimal("100000.00"), created_at=at(date(2026, 4, 2)))
    order_b = make_order(customer, vehicle, service, total_amount=Decimal("50000.00"), created_at=at(date(2026, 4, 5)))

    Payment.objects.create(work_order=order_b, amount=Decimal("30000.00"), method=Payment.Method.CASH, paid_at=at(date(2026, 4, 5), 13))
    Payment.objects.create(work_order=order_b, amount=Decimal("12000.00"), method=Payment.Method.CASH, paid_at=at(date(2026, 4, 8), 13))

    CashMovement.objects.create(
        business=business,
        movement_type=CashMovement.MovementType.INCOME,
        amount=Decimal("7000.00"),
        occurred_at=at(date(2026, 4, 3)),
        category="Otros ingresos",
    )
    CashMovement.objects.create(
        business=business,
        movement_type=CashMovement.MovementType.EXPENSE,
        amount=Decimal("2500.00"),
        occurred_at=at(date(2026, 4, 6)),
        category="Insumos",
        subcategory="Varios",
    )

    material = Material.objects.create(business=business, name="Cera", unit="ml")
    MaterialConsumption.objects.create(
        business=business,
        work_order=order_b,
        material=material,
        quantity=Decimal("1.00"),
        estimated_unit_cost=Decimal("8000.00"),
        estimated_total_cost=Decimal("8000.00"),
        consumed_at=date(2026, 4, 5),
    )

    summary = dashboard_period_summary(business, period_from, period_to)
    series = dashboard_period_series(business, period_from, period_to)

    # Structure: one point per day, ordered, covering the full window.
    assert series["interval"] == "day"
    assert series["from"] == "2026-04-01"
    assert series["to"] == "2026-04-10"
    assert len(series["points"]) == 10
    dates = [point["date"] for point in series["points"]]
    assert dates == sorted(dates)
    assert dates[0] == "2026-04-01"
    assert dates[-1] == "2026-04-10"

    # The invariant: the series never disagrees with the headline totals.
    for metric in FLOW_METRICS:
        assert metric_sum(series, metric) == summary[metric], metric

    # And each flow lands on the right day.
    by_date = {point["date"]: point for point in series["points"]}
    assert by_date["2026-04-02"]["billed_total"] == Decimal("100000.00")
    assert by_date["2026-04-05"]["billed_total"] == Decimal("50000.00")
    assert by_date["2026-04-05"]["collected_total"] == Decimal("30000.00")
    assert by_date["2026-04-08"]["collected_total"] == Decimal("12000.00")
    assert by_date["2026-04-05"]["estimated_margin_total"] == Decimal("42000.00")
    assert by_date["2026-04-03"]["cashflow_balance"] == Decimal("7000.00")
    assert by_date["2026-04-06"]["cashflow_balance"] == Decimal("-2500.00")
    # A day without activity is still present, at zero.
    assert by_date["2026-04-01"]["billed_total"] == Decimal("0.00")


@pytest.mark.django_db
def test_dashboard_series_collapses_to_weekly_for_long_ranges():
    business = BusinessAccount.get_default()
    customer, vehicle, service = base_catalog()
    period_from = date(2026, 1, 1)
    period_to = date(2026, 3, 11)  # 70 days > daily cap -> weekly buckets

    make_order(customer, vehicle, service, total_amount=Decimal("40000.00"), created_at=at(date(2026, 1, 3)))
    make_order(customer, vehicle, service, total_amount=Decimal("60000.00"), created_at=at(date(2026, 2, 20)))

    summary = dashboard_period_summary(business, period_from, period_to)
    series = dashboard_period_series(business, period_from, period_to)

    assert series["interval"] == "week"
    assert len(series["points"]) == 10  # ceil(70 / 7)
    # First bucket starts on the period start; buckets stay ordered.
    assert series["points"][0]["date"] == "2026-01-01"
    dates = [point["date"] for point in series["points"]]
    assert dates == sorted(dates)
    # The weekly invariant still holds.
    assert metric_sum(series, "billed_total") == summary["billed_total"] == Decimal("100000.00")


@pytest.mark.django_db
def test_dashboard_summary_endpoint_exposes_series_for_employer(api_client):
    response = api_client.get(reverse("dashboard-summary"))

    assert response.status_code == 200
    assert "series" in response.data
    series = response.data["series"]
    assert series["interval"] in ("day", "week")
    assert isinstance(series["points"], list)
    if series["points"]:
        point = series["points"][0]
        for key in (
            "date",
            "billed_total",
            "collected_total",
            "estimated_margin_total",
            "cashflow_balance",
        ):
            assert key in point


@pytest.mark.django_db
def test_dashboard_summary_endpoint_hides_series_from_employee(employee_client):
    response = employee_client.get(reverse("dashboard-summary"))

    assert response.status_code == 200
    assert "series" not in response.data

