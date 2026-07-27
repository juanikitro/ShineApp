from datetime import date, datetime, time
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone

from catalog.models import Service
from catalog.sector_defaults import ensure_default_sectors
from customers.models import Customer, Vehicle
from finance.models import Payment
from quotes.models import Quote, QuoteVehicleLine
from scheduling.models import Reservation
from workorders.models import WorkOrder


def create_work_order(
    *,
    business,
    customer,
    vehicle,
    service,
    day,
    total,
    status=Reservation.Status.DELIVERED,
):
    reservation = Reservation.objects.create(
        business=business,
        customer=customer,
        vehicle=vehicle,
        service=service,
        sector=service.sector,
        day=day,
        status=status,
    )
    work_order = reservation.work_order
    work_order.total_amount = total
    work_order.save(update_fields=["total_amount", "updated_at"])
    WorkOrder.objects.filter(pk=work_order.pk).update(
        created_at=timezone.make_aware(datetime.combine(day, time(10, 0)))
    )
    work_order.refresh_from_db()
    return reservation, work_order


@pytest.mark.django_db
def test_dashboard_summary_exposes_truthful_analytics_from_existing_records(
    api_client, default_business
):
    sectors = ensure_default_sectors(default_business)
    service = Service.objects.create(
        business=default_business,
        name="Detailing exterior",
        sector=sectors["detailing"],
        base_price=Decimal("100.00"),
    )
    second_service = Service.objects.create(
        business=default_business,
        name="Lavado premium",
        sector=sectors["lavadero"],
        base_price=Decimal("80.00"),
    )
    returning_customer = Customer.objects.create(
        business=default_business,
        name="Cliente recurrente",
    )
    new_customer = Customer.objects.create(
        business=default_business,
        name="Cliente nuevo",
    )
    returning_vehicle = Vehicle.objects.create(
        business=default_business,
        customer=returning_customer,
        license_plate="AA111AA",
        brand="Ford",
        model="Focus",
    )
    second_vehicle = Vehicle.objects.create(
        business=default_business,
        customer=returning_customer,
        license_plate="BB222BB",
        brand="Ford",
        model="Fiesta",
    )
    new_vehicle = Vehicle.objects.create(
        business=default_business,
        customer=new_customer,
        license_plate="CC333CC",
        brand="Toyota",
        model="Yaris",
    )

    create_work_order(
        business=default_business,
        customer=returning_customer,
        vehicle=returning_vehicle,
        service=service,
        day=date(2026, 6, 20),
        total=Decimal("80.00"),
    )
    accepted_reservation, accepted_order = create_work_order(
        business=default_business,
        customer=returning_customer,
        vehicle=returning_vehicle,
        service=service,
        day=date(2026, 7, 3),
        total=Decimal("120.00"),
    )
    group_first_reservation, _group_first_order = create_work_order(
        business=default_business,
        customer=returning_customer,
        vehicle=second_vehicle,
        service=service,
        day=date(2026, 7, 9),
        total=Decimal("90.00"),
    )
    group_second_reservation, _group_second_order = create_work_order(
        business=default_business,
        customer=returning_customer,
        vehicle=returning_vehicle,
        service=second_service,
        day=date(2026, 7, 9),
        total=Decimal("70.00"),
    )
    create_work_order(
        business=default_business,
        customer=new_customer,
        vehicle=new_vehicle,
        service=second_service,
        day=date(2026, 7, 12),
        total=Decimal("75.00"),
        status=Reservation.Status.IN_PROGRESS,
    )
    Payment.objects.create(
        business=default_business,
        work_order=accepted_order,
        amount=Decimal("120.00"),
        paid_at=timezone.make_aware(datetime.combine(date(2026, 7, 3), time(12, 0))),
    )

    Quote.objects.create(
        business=default_business,
        customer=returning_customer,
        vehicle=returning_vehicle,
        quote_date=date(2026, 7, 2),
        status=Quote.Status.SENT,
    )
    Quote.objects.create(
        business=default_business,
        customer=returning_customer,
        vehicle=returning_vehicle,
        reservation=accepted_reservation,
        quote_date=date(2026, 7, 3),
        status=Quote.Status.ACCEPTED,
    )
    Quote.objects.create(
        business=default_business,
        customer=new_customer,
        vehicle=new_vehicle,
        quote_date=date(2026, 7, 4),
        status=Quote.Status.REJECTED,
    )
    Quote.objects.create(
        business=default_business,
        customer=new_customer,
        vehicle=new_vehicle,
        quote_date=date(2026, 7, 4),
        status=Quote.Status.DRAFT,
    )
    group_quote = Quote.objects.create(
        business=default_business,
        customer=returning_customer,
        is_group=True,
        quote_date=date(2026, 7, 9),
        status=Quote.Status.ACCEPTED,
    )
    QuoteVehicleLine.objects.create(
        quote=group_quote,
        vehicle=second_vehicle,
        reservation=group_first_reservation,
    )
    QuoteVehicleLine.objects.create(
        quote=group_quote,
        vehicle=returning_vehicle,
        reservation=group_second_reservation,
    )

    response = api_client.get(
        reverse("dashboard-summary"),
        {"from": "2026-07-01", "to": "2026-07-14"},
    )

    assert response.status_code == 200
    analytics = response.data["analytics"]
    funnel = analytics["commercial_funnel"]
    assert funnel["unit"] == "quote"
    assert funnel["total_quotes"] == 5
    assert funnel["accepted_quotes"] == 2
    assert funnel["booked_quotes"] == 2
    assert funnel["delivered_quotes"] == 2
    assert funnel["collected_quotes"] == 1
    assert funnel["draft_quotes"] == 1
    assert funnel["rejected_quotes"] == 1

    recurrence = analytics["customer_recurrence"]
    assert recurrence["customers_count"] == 2
    assert recurrence["recurring_customers_count"] == 1
    assert recurrence["new_customers_count"] == 1
    assert Decimal(recurrence["repeat_rate"]) == Decimal("50.00")

    service_rows = {row["service_name"]: row for row in analytics["service_comparison"]}
    assert Decimal(service_rows["Detailing exterior"]["current"]["billed_total"]) == Decimal(
        "210.00"
    )
    assert Decimal(service_rows["Detailing exterior"]["previous"]["billed_total"]) == Decimal(
        "80.00"
    )
    assert Decimal(service_rows["Detailing exterior"]["margin_rate_delta_pp"]) == Decimal(
        "0.00"
    )
    assert len(analytics["previous_series"]["points"]) == 14

    assert Decimal(response.data["average_ticket"]) == Decimal("88.75")
    assert Decimal(response.data["previous_period"]["average_ticket"]) == Decimal(
        "80.00"
    )

    weekly_total = sum(row["entered_count"] for row in analytics["weekly_workload"]["weeks"])
    assert weekly_total == 4


@pytest.mark.django_db
def test_dashboard_analytics_preserves_empty_periods_and_partial_group_quotes(
    api_client, default_business
):
    sectors = ensure_default_sectors(default_business)
    service = Service.objects.create(
        business=default_business,
        name="Lavado completo",
        sector=sectors["lavadero"],
        base_price=Decimal("100.00"),
    )
    customer = Customer.objects.create(business=default_business, name="Cliente nuevo")
    first_vehicle = Vehicle.objects.create(
        business=default_business,
        customer=customer,
        license_plate="DD444DD",
        brand="Honda",
        model="Fit",
    )
    second_vehicle = Vehicle.objects.create(
        business=default_business,
        customer=customer,
        license_plate="EE555EE",
        brand="Honda",
        model="City",
    )
    reservation, _work_order = create_work_order(
        business=default_business,
        customer=customer,
        vehicle=first_vehicle,
        service=service,
        day=date(2026, 7, 3),
        total=Decimal("100.00"),
        status=Reservation.Status.IN_PROGRESS,
    )
    group_quote = Quote.objects.create(
        business=default_business,
        customer=customer,
        is_group=True,
        quote_date=date(2026, 7, 3),
        status=Quote.Status.ACCEPTED,
    )
    QuoteVehicleLine.objects.create(
        quote=group_quote,
        vehicle=first_vehicle,
        reservation=reservation,
    )
    QuoteVehicleLine.objects.create(quote=group_quote, vehicle=second_vehicle)

    current_response = api_client.get(
        reverse("dashboard-summary"),
        {"from": "2026-07-01", "to": "2026-07-31"},
    )

    assert current_response.status_code == 200
    current_analytics = current_response.data["analytics"]
    current_funnel = current_analytics["commercial_funnel"]
    assert current_funnel["total_quotes"] == 1
    assert current_funnel["booked_quotes"] == 0
    assert current_funnel["delivered_quotes"] == 0
    assert current_funnel["collected_quotes"] == 0
    current_service = current_analytics["service_comparison"][0]
    assert current_service["previous"]["margin_rate"] is None
    assert current_service["margin_rate_delta_pp"] is None

    empty_response = api_client.get(
        reverse("dashboard-summary"),
        {"from": "2026-08-01", "to": "2026-08-31"},
    )

    assert empty_response.status_code == 200
    empty_analytics = empty_response.data["analytics"]
    assert Decimal(empty_response.data["average_ticket"]) == Decimal("0.00")
    assert empty_analytics["commercial_funnel"]["total_quotes"] == 0
    assert empty_analytics["customer_recurrence"] == {
        "unit": "customer_with_operational_work_order",
        "customers_count": 0,
        "recurring_customers_count": 0,
        "new_customers_count": 0,
        "repeat_rate": Decimal("0.00"),
    }
    assert all(
        row["entered_count"] == 0
        for row in empty_analytics["weekly_workload"]["weeks"]
    )
    previous_only_service = empty_analytics["service_comparison"][0]
    assert previous_only_service["current"]["margin_rate"] is None
    assert previous_only_service["margin_rate_delta_pp"] is None
