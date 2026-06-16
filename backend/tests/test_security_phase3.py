"""Regresiones de seguridad — Fase 3.

Cubre: subscription_type no auto-asignable desde /me, gate de trial detras de
feature flag, guard de caja cerrada scopeado por negocio, y validacion de
precios/totales no negativos.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers
from rest_framework.test import APIClient

from core.models import BusinessAccount, BusinessProfile, UserProfile


def create_business(name, slug):
    business = BusinessAccount.objects.create(name=name, slug=slug)
    BusinessProfile.objects.create(business=business, name=name)
    return business


# ---------------------------------------------------------------------------
# subscription_type: no auto-asignable desde /me.
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_me_patch_cannot_change_subscription_type(api_client, default_business):
    profile = BusinessProfile.get_solo(business=default_business)
    profile.subscription_type = BusinessProfile.SubscriptionType.TRIAL
    profile.save()

    resp = api_client.patch(reverse("auth-me"), {"subscription_type": "premium"}, format="json")

    assert resp.status_code == 200
    profile.refresh_from_db()
    assert profile.subscription_type == BusinessProfile.SubscriptionType.TRIAL


# ---------------------------------------------------------------------------
# Gate de trial detras de feature flag.
# ---------------------------------------------------------------------------
def _set_plan(business, plan, *, expired):
    profile = BusinessProfile.get_solo(business=business)
    profile.subscription_type = plan
    profile.trial_ends_at = timezone.now() - timedelta(days=1) if expired else timezone.now() + timedelta(days=10)
    profile.save()
    return profile


@pytest.mark.django_db
def test_trial_gate_off_by_default_allows_expired(api_client, default_business):
    _set_plan(default_business, BusinessProfile.SubscriptionType.TRIAL, expired=True)
    resp = api_client.get(reverse("customer-list"))
    assert resp.status_code == 200


@pytest.mark.django_db
def test_trial_gate_blocks_expired_trial_when_enabled(api_client, default_business):
    _set_plan(default_business, BusinessProfile.SubscriptionType.TRIAL, expired=True)
    with override_settings(ENFORCE_SUBSCRIPTION_ACCESS=True):
        resp = api_client.get(reverse("customer-list"))
    assert resp.status_code == 403


@pytest.mark.django_db
def test_trial_gate_allows_paid_plan_even_if_expired(api_client, default_business):
    _set_plan(default_business, BusinessProfile.SubscriptionType.PREMIUM, expired=True)
    with override_settings(ENFORCE_SUBSCRIPTION_ACCESS=True):
        resp = api_client.get(reverse("customer-list"))
    assert resp.status_code == 200


@pytest.mark.django_db
def test_trial_gate_allows_active_trial_when_enabled(api_client, default_business):
    _set_plan(default_business, BusinessProfile.SubscriptionType.TRIAL, expired=False)
    with override_settings(ENFORCE_SUBSCRIPTION_ACCESS=True):
        resp = api_client.get(reverse("customer-list"))
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Guard de caja cerrada: scopeado por negocio (no cross-tenant).
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_is_cash_day_closed_is_business_scoped():
    from finance.cash import is_cash_day_closed
    from finance.models import CashClosure

    business_a = create_business("Caja A", "caja-a")
    business_b = create_business("Caja B", "caja-b")
    day = timezone.localdate()
    CashClosure.objects.create(
        business=business_b,
        day=day,
        total_income=Decimal("0.00"),
        total_expense=Decimal("0.00"),
        balance=Decimal("0.00"),
    )

    # B cerro su dia; A NO. El guard no debe cruzar tenants.
    assert is_cash_day_closed(day, business=business_b) is True
    assert is_cash_day_closed(day, business=business_a) is False


# ---------------------------------------------------------------------------
# Precios/totales no negativos (se preserva la edicion de precio, sin negativos).
# ---------------------------------------------------------------------------
def test_reservation_item_rejects_negative_unit_price():
    from scheduling.serializers import ReservationItemSerializer

    with pytest.raises(serializers.ValidationError):
        ReservationItemSerializer().validate_unit_price(Decimal("-0.01"))


def test_quote_item_rejects_negative_unit_price():
    from quotes.serializers import QuoteItemSerializer

    with pytest.raises(serializers.ValidationError):
        QuoteItemSerializer().validate_unit_price(Decimal("-0.01"))


def test_work_order_rejects_negative_total():
    from workorders.serializers import WorkOrderSerializer

    with pytest.raises(serializers.ValidationError):
        WorkOrderSerializer().validate_total_amount(Decimal("-1.00"))
