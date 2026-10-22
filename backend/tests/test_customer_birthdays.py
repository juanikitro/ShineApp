from datetime import date, datetime, timezone as dt_timezone

import pytest
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone

from customers.models import Customer


def freeze_localdate(monkeypatch, day):
    monkeypatch.setattr(timezone, "localdate", lambda *args, **kwargs: day)


@pytest.mark.django_db
def test_birthday_window_crosses_year_end(api_client, monkeypatch):
    freeze_localdate(monkeypatch, date(2026, 12, 30))
    new_year = Customer.objects.create(name="Cumple enero", birthday_month=1, birthday_day=1)
    Customer.objects.create(name="Cumple pasado", birthday_month=12, birthday_day=29)

    response = api_client.get(reverse("customer-birthdays"), {"days": 3})

    assert response.status_code == 200
    assert [item["id"] for item in response.data["results"]] == [new_year.id]
    assert response.data["results"][0]["next_birthday"] == "2027-01-01"
    assert response.data["results"][0]["days_until_birthday"] == 2
    assert response.data["results"][0]["has_birthday_alert"] is True


@pytest.mark.django_db
def test_birthday_already_passed_this_year_points_to_next_year(monkeypatch):
    freeze_localdate(monkeypatch, date(2026, 12, 30))
    customer = Customer.objects.create(name="Cumple pasado", birthday_month=12, birthday_day=29)

    assert customer.next_birthday == date(2027, 12, 29)
    assert customer.days_until_birthday == 364
    assert customer.has_birthday_alert is False


@pytest.mark.django_db
def test_february_29_birthday_is_alerted_on_february_28_in_non_leap_years(api_client, monkeypatch):
    freeze_localdate(monkeypatch, date(2027, 2, 26))
    customer = Customer.objects.create(name="Cumple bisiesto", birthday_month=2, birthday_day=29)

    response = api_client.get(reverse("customer-birthdays"), {"days": 3})

    assert [item["id"] for item in response.data["results"]] == [customer.id]
    assert response.data["results"][0]["next_birthday"] == "2027-02-28"
    assert response.data["results"][0]["days_until_birthday"] == 2
    assert response.data["results"][0]["birthday_label"] == "29/02"


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("today", "expected_next", "expected_days"),
    [
        (date(2028, 2, 27), date(2028, 2, 29), 2),
        (date(2027, 2, 28), date(2027, 2, 28), 0),
        (date(2027, 3, 1), date(2028, 2, 29), 365),
        (date(2028, 3, 1), date(2029, 2, 28), 364),
    ],
)
def test_february_29_birthday_next_date(monkeypatch, today, expected_next, expected_days):
    freeze_localdate(monkeypatch, today)
    customer = Customer.objects.create(name="Cumple bisiesto", birthday_month=2, birthday_day=29)

    assert customer.next_birthday == expected_next
    assert customer.days_until_birthday == expected_days


@pytest.mark.django_db
def test_incomplete_birthday_is_ignored_without_errors(api_client, monkeypatch):
    freeze_localdate(monkeypatch, date(2026, 3, 14))
    # Datos legados: el serializer exige dia y mes, pero el modelo admite nulos por separado.
    only_month = Customer.objects.create(name="Solo mes", birthday_month=3)
    only_day = Customer.objects.create(name="Solo dia", birthday_day=14)

    response = api_client.get(reverse("customer-birthdays"), {"days": 3})

    assert response.status_code == 200
    assert response.data["results"] == []
    for customer in (only_month, only_day):
        assert customer.birthday_label == ""
        assert customer.next_birthday is None
        assert customer.days_until_birthday is None
        assert customer.has_birthday_alert is False


@pytest.mark.django_db
def test_birthday_window_can_be_empty(api_client, monkeypatch):
    freeze_localdate(monkeypatch, date(2026, 3, 14))
    Customer.objects.create(name="Cumple manana", birthday_month=3, birthday_day=15)

    response = api_client.get(reverse("customer-birthdays"), {"days": 0})

    assert response.status_code == 200
    assert response.data["days"] == 0
    assert response.data["results"] == []


@pytest.mark.django_db
def test_birthday_uses_business_local_day_not_utc(api_client, monkeypatch):
    # 02:00 UTC del 15/03 sigue siendo 14/03 en Buenos Aires (UTC-3).
    monkeypatch.setattr(timezone, "now", lambda: datetime(2026, 3, 15, 2, 0, tzinfo=dt_timezone.utc))
    customer = Customer.objects.create(name="Cumple hoy", birthday_month=3, birthday_day=14)

    with override_settings(TIME_ZONE="America/Argentina/Buenos_Aires"):
        response = api_client.get(reverse("customer-birthdays"), {"days": 0})

    assert [item["id"] for item in response.data["results"]] == [customer.id]
    assert response.data["results"][0]["next_birthday"] == "2026-03-14"
    assert response.data["results"][0]["days_until_birthday"] == 0
