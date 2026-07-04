from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from catalog.models import Service
from core.admin import BusinessAccountAdmin, BusinessProfileAdmin
from core.models import BusinessAccount, BusinessProfile, UserProfile
from customers.models import Customer, Vehicle
from inventory.models import Material
from quotes.models import Quote


def create_business(name, slug):
    business = BusinessAccount.objects.create(name=name, slug=slug)
    BusinessProfile.objects.create(business=business, name=name)
    return business


def create_business_user(username, business, role="empleador", password="clave123"):
    user = get_user_model().objects.create_user(username=username, password=password)
    group, _ = Group.objects.get_or_create(name=role)
    user.groups.add(group)
    UserProfile.objects.create(user=user, business=business)
    return user


@pytest.mark.django_db
def test_admin_provisioning_creates_business_profile_and_initial_employer(rf):
    superuser = get_user_model().objects.create_superuser(
        username="platform-admin",
        password="admin123",
        email="platform@example.com",
    )
    request = rf.post("/admin/core/businessaccount/add/")
    request.user = superuser
    model_admin = BusinessAccountAdmin(BusinessAccount, admin.AdminSite())
    form_class = model_admin.get_form(request)
    form = form_class(
        data={
            "name": "King Shine",
            "slug": "king-shine",
            "is_active": "on",
            "initial_employer_username": "king-admin",
            "initial_employer_email": "dueno@king.test",
            "initial_employer_password": "dueno12345",
        }
    )

    assert form.is_valid(), form.errors
    business = form.save(commit=False)
    model_admin.save_model(request, business, form, change=False)

    business.refresh_from_db()
    assert business.profile.name == "King Shine"
    employer = get_user_model().objects.get(username="king-admin")
    assert employer.email == "dueno@king.test"
    assert employer.check_password("dueno12345")
    assert employer.is_staff is False
    assert employer.is_superuser is False
    assert employer.groups.filter(name="empleador").exists()
    assert employer.profile.business == business


@pytest.mark.django_db
def test_admin_can_extend_trial_without_changing_paid_profiles(rf):
    superuser = get_user_model().objects.create_superuser(
        username="platform-admin",
        password="admin123",
        email="platform@example.com",
    )
    trial_business = create_business("Trial A", "trial-a")
    paid_business = create_business("Premium B", "premium-b")
    now = timezone.now()
    trial_profile = trial_business.profile
    trial_profile.subscription_type = BusinessProfile.SubscriptionType.TRIAL
    trial_profile.trial_ends_at = now + timedelta(days=1)
    trial_profile.save(update_fields=["subscription_type", "trial_ends_at", "updated_at"])
    paid_profile = paid_business.profile
    paid_profile.subscription_type = BusinessProfile.SubscriptionType.PREMIUM
    paid_profile.trial_ends_at = now + timedelta(days=1)
    paid_profile.save(update_fields=["subscription_type", "trial_ends_at", "updated_at"])

    request = rf.post("/admin/core/businessprofile/")
    request.user = superuser
    model_admin = BusinessProfileAdmin(BusinessProfile, admin.AdminSite())
    with patch.object(model_admin, "message_user") as message_user:
        model_admin.extend_trials_7_days(
            request,
            BusinessProfile.objects.filter(pk__in=[trial_profile.pk, paid_profile.pk]),
        )

    trial_profile.refresh_from_db()
    paid_profile.refresh_from_db()
    assert timedelta(days=7) < trial_profile.trial_ends_at - now <= timedelta(days=8)
    assert paid_profile.trial_ends_at <= now + timedelta(days=1, seconds=1)
    message_user.assert_called_once()


@pytest.mark.django_db
def test_admin_can_suspend_only_expired_trial_businesses_and_invalidate_tokens(rf):
    superuser = get_user_model().objects.create_superuser(
        username="platform-admin",
        password="admin123",
        email="platform@example.com",
    )
    expired_business = create_business("Trial vencido", "trial-vencido")
    active_business = create_business("Trial activo", "trial-activo")
    expired_owner = create_business_user("dueno-vencido", expired_business, password="dueno123")
    active_owner = create_business_user("dueno-activo", active_business, password="dueno123")
    expired_token = Token.objects.create(user=expired_owner)
    active_token = Token.objects.create(user=active_owner)
    now = timezone.now()
    expired_business.profile.trial_ends_at = now - timedelta(days=1)
    expired_business.profile.save(update_fields=["trial_ends_at", "updated_at"])
    active_business.profile.trial_ends_at = now + timedelta(days=5)
    active_business.profile.save(update_fields=["trial_ends_at", "updated_at"])

    request = rf.post("/admin/core/businessprofile/")
    request.user = superuser
    model_admin = BusinessProfileAdmin(BusinessProfile, admin.AdminSite())
    with patch.object(model_admin, "message_user") as message_user:
        model_admin.suspend_expired_trial_businesses(
            request,
            BusinessProfile.objects.filter(pk__in=[expired_business.profile.pk, active_business.profile.pk]),
        )

    expired_business.refresh_from_db()
    active_business.refresh_from_db()
    assert expired_business.is_active is False
    assert expired_business.deactivation_reason == "Trial vencido desde Django admin"
    assert active_business.is_active is True
    assert not Token.objects.filter(pk=expired_token.pk).exists()
    assert Token.objects.filter(pk=active_token.pk).exists()
    message_user.assert_called_once()


@pytest.mark.django_db
def test_suspended_business_cannot_login_or_keep_using_existing_token():
    business = create_business("Negocio A", "negocio-a")
    create_business_user("dueno-a", business, password="dueno123")
    Customer.objects.create(business=business, name="Cliente A")

    login_client = APIClient()
    login_response = login_client.post(
        reverse("auth-login"),
        {"username": "dueno-a", "password": "dueno123"},
        format="json",
    )
    assert login_response.status_code == 200
    token = login_response.data["token"]

    business.deactivate(reason="Cuenta dada de baja")

    blocked_login = APIClient().post(
        reverse("auth-login"),
        {"username": "dueno-a", "password": "dueno123"},
        format="json",
    )
    assert blocked_login.status_code == 403
    assert "negocio" in str(blocked_login.data).lower()

    token_client = APIClient()
    token_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    blocked_api = token_client.get(reverse("customer-list"))
    assert blocked_api.status_code == 401
    assert Customer.objects.filter(business=business, name="Cliente A").exists()


@pytest.mark.django_db
def test_business_users_only_see_their_own_customers(api_client):
    business_a = api_client.user.profile.business
    business_b = create_business("Negocio B", "negocio-b")
    customer_a = Customer.objects.create(business=business_a, name="Cliente A")
    customer_b = Customer.objects.create(business=business_b, name="Cliente B")

    list_response = api_client.get(reverse("customer-list"))
    assert list_response.status_code == 200
    names = {item["name"] for item in list_response.data["results"]}
    assert names == {customer_a.name}

    detail_response = api_client.get(reverse("customer-detail", args=[customer_b.id]))
    assert detail_response.status_code == 404


@pytest.mark.django_db
def test_employer_created_employees_are_scoped_to_the_same_business(api_client):
    business_a = api_client.user.profile.business
    business_b = create_business("Negocio B", "negocio-b")
    employer_b = create_business_user("dueno-b", business_b, role="empleador")
    client_b = APIClient()
    client_b.force_authenticate(user=employer_b)

    create_response = api_client.post(
        reverse("auth-employees"),
        {
            "username": "operario-a",
            "email": "operario-a@example.com",
            "password": "operario123",
        },
        format="json",
    )
    assert create_response.status_code == 201
    employee = get_user_model().objects.get(username="operario-a")
    assert employee.profile.business == business_a

    list_a = api_client.get(reverse("auth-employees"))
    list_b = client_b.get(reverse("auth-employees"))
    assert any(item["username"] == "operario-a" for item in list_a.data)
    assert all(item["username"] != "operario-a" for item in list_b.data)


@pytest.mark.django_db
def test_business_scoped_uniqueness_allows_same_operational_identifiers_in_different_businesses():
    business_a = create_business("Negocio A", "negocio-a")
    business_b = create_business("Negocio B", "negocio-b")
    customer_a = Customer.objects.create(business=business_a, name="Cliente A")
    customer_b = Customer.objects.create(business=business_b, name="Cliente B")

    Vehicle.objects.create(business=business_a, customer=customer_a, license_plate="AA111AA")
    Vehicle.objects.create(business=business_b, customer=customer_b, license_plate="AA111AA")
    Material.objects.create(business=business_a, name="Shampoo", unit="ml", sku="SKU-1")
    Material.objects.create(business=business_b, name="Shampoo", unit="ml", sku="SKU-1")

    with pytest.raises(IntegrityError), transaction.atomic():
        Vehicle.objects.create(business=business_a, customer=customer_a, license_plate="AA111AA")
    with pytest.raises(IntegrityError), transaction.atomic():
        Material.objects.create(business=business_a, name="Cera", unit="ml", sku="SKU-1")


@pytest.mark.django_db
def test_quote_defaults_use_request_business_profile():
    business_a = create_business("Negocio A", "negocio-a")
    business_b = create_business("Negocio B", "negocio-b")
    user_a = create_business_user("dueno-a", business_a)
    user_b = create_business_user("dueno-b", business_b)
    business_a.profile.default_quote_terms = "Terminos A"
    business_a.profile.save()
    business_b.profile.default_quote_terms = "Terminos B"
    business_b.profile.save()

    from catalog.sector_defaults import ensure_default_sectors
    sectors_a = ensure_default_sectors(business_a)
    sectors_b = ensure_default_sectors(business_b)
    customer_a = Customer.objects.create(business=business_a, name="Cliente A")
    vehicle_a = Vehicle.objects.create(business=business_a, customer=customer_a, license_plate="AA111AA")
    service_a = Service.objects.create(
        business=business_a,
        name="Lavado A",
        sector=sectors_a["lavadero"],
        base_price=Decimal("100.00"),
    )
    customer_b = Customer.objects.create(business=business_b, name="Cliente B")
    vehicle_b = Vehicle.objects.create(business=business_b, customer=customer_b, license_plate="BB111BB")
    service_b = Service.objects.create(
        business=business_b,
        name="Lavado B",
        sector=sectors_b["lavadero"],
        base_price=Decimal("200.00"),
    )

    client_a = APIClient()
    client_a.force_authenticate(user=user_a)
    client_b = APIClient()
    client_b.force_authenticate(user=user_b)

    response_a = client_a.post(
        reverse("quote-list"),
        {
            "customer": customer_a.id,
            "vehicle": vehicle_a.id,
            "items": [{"service": service_a.id, "quantity": "1"}],
        },
        format="json",
    )
    response_b = client_b.post(
        reverse("quote-list"),
        {
            "customer": customer_b.id,
            "vehicle": vehicle_b.id,
            "items": [{"service": service_b.id, "quantity": "1"}],
        },
        format="json",
    )

    assert response_a.status_code == 201, response_a.data
    assert response_b.status_code == 201, response_b.data
    assert Quote.objects.get(id=response_a.data["id"]).business == business_a
    assert response_a.data["business_name"] == "Negocio A"
    assert response_a.data["terms"] == "Terminos A"
    assert Quote.objects.get(id=response_b.data["id"]).business == business_b
    assert response_b.data["business_name"] == "Negocio B"
    assert response_b.data["terms"] == "Terminos B"
