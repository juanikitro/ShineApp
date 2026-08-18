from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.urls import reverse
from drf_spectacular.generators import SchemaGenerator
from rest_framework.test import APIClient

from catalog.models import Service
from catalog.sector_defaults import ensure_default_sectors
from core.models import BusinessAccount, BusinessProfile
from customers.models import Customer, Vehicle
from finance.models import Payment
from scheduling.models import Reservation


TODAY = date(2026, 7, 28)


def create_business_records(business, *, suffix=""):
    sector = ensure_default_sectors(business)["lavadero"]
    customer = Customer.objects.create(
        business=business,
        name=f"Cliente {suffix or business.id}",
        phone="1122334455",
    )
    vehicle = Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate=f"AA{business.id:03d}BB",
        brand="Ford",
        model="Focus",
    )
    service = Service.objects.create(
        business=business,
        sector=sector,
        name=f"Lavado {suffix or business.id}",
        base_price=Decimal("15000.00"),
        estimated_duration_minutes=60,
    )
    return customer, vehicle, service


def create_reservation(
    records,
    *,
    day=TODAY - timedelta(days=4),
    exit_day=TODAY - timedelta(days=1),
    status=Reservation.Status.CONFIRMED,
):
    customer, vehicle, service = records
    return Reservation.objects.create(
        business=customer.business,
        customer=customer,
        vehicle=vehicle,
        service=service,
        sector=service.sector,
        day=day,
        exit_day=exit_day,
        status=status,
    )


def pay(reservation, amount):
    return Payment.objects.create(
        business=reservation.business,
        work_order=reservation.work_order,
        amount=amount,
        method=Payment.Method.CASH,
        payment_type=Payment.PaymentType.PAYMENT,
    )


@pytest.mark.django_db
@patch("scheduling.views.cash_day", return_value=TODAY)
def test_overdue_endpoint_applies_deadline_status_balance_and_stable_order(
    cash_day_mock,
    api_client,
    default_business,
):
    records = create_business_records(default_business)
    exit_day_overdue = create_reservation(records)
    fallback_overdue = create_reservation(
        records,
        day=TODAY - timedelta(days=3),
        exit_day=None,
    )
    pay(fallback_overdue, Decimal("15000.00"))
    same_day_later_id = create_reservation(records)

    delivered_with_partial_payment = create_reservation(
        records,
        day=TODAY - timedelta(days=7),
        exit_day=TODAY - timedelta(days=2),
        status=Reservation.Status.DELIVERED,
    )
    pay(delivered_with_partial_payment, Decimal("5000.00"))

    delivered_and_paid = create_reservation(
        records,
        status=Reservation.Status.DELIVERED,
    )
    pay(delivered_and_paid, Decimal("15000.00"))
    create_reservation(records, day=TODAY, exit_day=TODAY)
    create_reservation(records, status=Reservation.Status.CANCELED)
    deleted = create_reservation(records)
    deleted.delete()

    response = api_client.get(reverse("reservation-overdue"))

    assert response.status_code == 200
    assert [row["id"] for row in response.data] == [
        fallback_overdue.id,
        delivered_with_partial_payment.id,
        exit_day_overdue.id,
        same_day_later_id.id,
    ]
    payload_by_id = {row["id"]: row for row in response.data}
    payment_only_payload = payload_by_id[delivered_with_partial_payment.id]
    assert payment_only_payload["deadline"] == "2026-07-26"
    assert payment_only_payload["days_overdue"] == 2
    assert payment_only_payload["delivery_pending"] is False
    assert payment_only_payload["payment_pending"] is True
    assert Decimal(payment_only_payload["balance_due"]) == Decimal("10000.00")
    assert (
        payment_only_payload["payment_work_order"]["id"]
        == delivered_with_partial_payment.work_order.id
    )

    fallback_payload = payload_by_id[fallback_overdue.id]
    assert fallback_payload["deadline"] == "2026-07-25"
    assert fallback_payload["days_overdue"] == 3
    assert fallback_payload["delivery_pending"] is True
    assert fallback_payload["payment_pending"] is False
    assert Decimal(fallback_payload["balance_due"]) == Decimal("0.00")
    assert fallback_payload["items"][0]["service_name"] == records[2].name
    cash_day_mock.assert_called_once()


@pytest.mark.django_db
@patch("scheduling.views.cash_day", return_value=TODAY)
def test_overdue_endpoint_omits_economy_for_employee_and_hides_payment_only_rows(
    _cash_day_mock,
    api_client,
    employee_client,
    default_business,
):
    records = create_business_records(default_business)
    both_pending = create_reservation(records)
    payment_only = create_reservation(records, status=Reservation.Status.DELIVERED)

    employer_response = api_client.get(reverse("reservation-overdue"))
    employee_response = employee_client.get(reverse("reservation-overdue"))

    assert {row["id"] for row in employer_response.data} == {
        both_pending.id,
        payment_only.id,
    }
    assert [row["id"] for row in employee_response.data] == [both_pending.id]
    employee_row = employee_response.data[0]
    for field in ["payment_pending", "balance_due", "payment_work_order"]:
        assert field not in employee_row
    assert set(employee_row["items"][0]) == {
        "id",
        "service",
        "service_name",
        "service_icon",
        "description",
    }


@pytest.mark.django_db
@patch("scheduling.views.cash_day", return_value=TODAY)
def test_overdue_endpoint_defines_missing_work_order_as_delivery_only(
    _cash_day_mock,
    api_client,
    default_business,
):
    records = create_business_records(default_business)
    delivery_pending = create_reservation(records)
    delivery_pending.work_order.hard_delete()
    delivered = create_reservation(records, status=Reservation.Status.DELIVERED)
    delivered.work_order.hard_delete()

    response = api_client.get(reverse("reservation-overdue"))

    assert response.status_code == 200
    assert [row["id"] for row in response.data] == [delivery_pending.id]
    assert response.data[0]["delivery_pending"] is True
    assert response.data[0]["payment_pending"] is False
    assert Decimal(response.data[0]["balance_due"]) == Decimal("0.00")
    assert response.data[0]["payment_work_order"] is None


@pytest.mark.django_db
@patch("scheduling.views.cash_day", return_value=TODAY)
def test_overdue_endpoint_is_scoped_to_request_business(
    _cash_day_mock,
    api_client,
    default_business,
):
    own_records = create_business_records(default_business, suffix="propio")
    own_reservation = create_reservation(own_records)

    other_business = BusinessAccount.objects.create(
        name="Otro negocio",
        slug="otro-negocio",
    )
    BusinessProfile.objects.create(business=other_business, name="Otro negocio")
    other_records = create_business_records(other_business, suffix="ajeno")
    create_reservation(other_records)

    response = api_client.get(reverse("reservation-overdue"))

    assert response.status_code == 200
    assert [row["id"] for row in response.data] == [own_reservation.id]


@pytest.mark.django_db
def test_overdue_endpoint_requires_an_authenticated_active_business():
    response = APIClient().get(reverse("reservation-overdue"))

    assert response.status_code in {401, 403}


def test_overdue_openapi_uses_the_dedicated_response_contract():
    schema = SchemaGenerator().get_schema(public=True)
    response_schema = schema["paths"]["/api/reservations/overdue/"]["get"][
        "responses"
    ]["200"]["content"]["application/json"]["schema"]

    assert response_schema["type"] == "array"
    component_name = response_schema["items"]["$ref"].rsplit("/", 1)[-1]
    assert component_name == "OverdueReservationResponse"
    response_components = {
        item["$ref"].rsplit("/", 1)[-1]
        for item in schema["components"]["schemas"][component_name]["oneOf"]
    }
    assert response_components == {
        "OverdueReservation",
        "OverdueReservationEconomy",
    }
    operational_properties = schema["components"]["schemas"][
        "OverdueReservation"
    ]["properties"]
    economy_properties = schema["components"]["schemas"][
        "OverdueReservationEconomy"
    ]["properties"]
    assert {
        "payment_pending",
        "balance_due",
        "payment_work_order",
    }.isdisjoint(operational_properties)
    assert {
        "deadline",
        "days_overdue",
        "delivery_pending",
        "payment_pending",
        "balance_due",
        "payment_work_order",
    } <= set(economy_properties)
