import pytest
from django.contrib.auth.models import AnonymousUser, Group
from django.contrib.auth import get_user_model
from django.core.exceptions import DisallowedHost
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers

from core.models import AuditLog
from core.models import BusinessAccount, UserProfile
from core.permissions import (
    ActiveBusinessUser,
    business_for_user,
    context_can_view_economy,
    file_url,
    scope_queryset_to_business,
    validate_same_business,
)
from core.storage import SupabaseS3Storage
from customers.models import Customer
from finance.cash import (
    cash_day,
    cash_movement_source_kind,
    ensure_adjustment_target_closed,
    request_user_from_context,
    signed_amount_for,
)
from finance.models import CashClosure, CashMovement


@pytest.mark.django_db
def test_audit_log_filters_by_module_action_date_and_search(api_client):
    business = api_client.user.profile.business
    AuditLog.objects.create(
        business=business,
        actor=api_client.user,
        actor_username="admin",
        actor_email="admin@example.com",
        action="create",
        module="customers",
        entity_type="Customer",
        entity_id="42",
        entity_label="Ana Lopez",
        request_path="/api/customers/",
    )
    AuditLog.objects.create(
        business=business,
        actor=api_client.user,
        actor_username="admin",
        action="delete",
        module="inventory",
        entity_type="Material",
        entity_id="99",
        entity_label="Shampoo",
        request_path="/api/materials/99/",
    )

    response = api_client.get(
        reverse("audit-log"),
        {
            "module": "customers",
            "action": "create",
            "from": "2026-01-01",
            "to": "2100-01-01",
            "q": "Ana",
        },
    )

    assert response.status_code == 200, response.data
    payload = response.data["results"] if isinstance(response.data, dict) else response.data
    assert [item["entity_label"] for item in payload] == ["Ana Lopez"]


@override_settings(SUPABASE_STORAGE_PUBLIC_URL="https://cdn.example.test/storage")
def test_supabase_s3_storage_builds_public_urls_without_query_auth():
    storage = SupabaseS3Storage(location="business-logos")
    storage.querystring_auth = False

    assert (
        storage.url("/profile logo.png")
        == "https://cdn.example.test/storage/business-logos/profile%20logo.png"
    )


@override_settings(SUPABASE_STORAGE_PUBLIC_URL="")
def test_supabase_s3_storage_delegates_when_public_url_is_not_configured(monkeypatch):
    calls = {}

    def fake_super_url(self, name, parameters=None, expire=None, http_method=None):
        calls["args"] = {
            "name": name,
            "parameters": parameters,
            "expire": expire,
            "http_method": http_method,
        }
        return "signed-url"

    monkeypatch.setattr("storages.backends.s3.S3Storage.url", fake_super_url)
    storage = SupabaseS3Storage()

    assert storage.url("private.pdf", parameters={"download": "1"}, expire=60, http_method="GET") == "signed-url"
    assert calls["args"] == {
        "name": "private.pdf",
        "parameters": {"download": "1"},
        "expire": 60,
        "http_method": "GET",
    }


@pytest.mark.django_db
def test_business_permission_helpers_scope_and_validate_active_business(default_business):
    other_business = BusinessAccount.objects.create(name="Otro negocio", slug="otro")
    customer = Customer.objects.create(business=default_business, name="Cliente propio")
    other_customer = Customer.objects.create(business=other_business, name="Cliente externo")

    assert list(scope_queryset_to_business(Customer.objects.all(), None)) == []
    assert list(scope_queryset_to_business(Customer.objects.all(), default_business)) == [customer]
    with pytest.raises(serializers.ValidationError):
        validate_same_business(default_business, other_customer)

    user = get_user_model().objects.create_user(username="sin-profile")
    assert business_for_user(user, create_missing=False) is None
    assert business_for_user(AnonymousUser()) is None
    assert business_for_user(user) == default_business


@pytest.mark.django_db
def test_active_business_permission_blocks_staff_and_inactive_business(rf, default_business):
    employer_group, _ = Group.objects.get_or_create(name="empleador")
    active_user = get_user_model().objects.create_user(username="activo")
    active_user.groups.add(employer_group)
    UserProfile.objects.create(user=active_user, business=default_business)
    inactive_business = BusinessAccount.objects.create(name="Suspendido", slug="suspendido", is_active=False)
    inactive_user = get_user_model().objects.create_user(username="suspendido")
    UserProfile.objects.create(user=inactive_user, business=inactive_business)
    staff_user = get_user_model().objects.create_user(username="staff", is_staff=True)

    permission = ActiveBusinessUser()
    request = rf.get("/")
    request.user = active_user
    assert permission.has_permission(request, None) is True

    request.user = staff_user
    assert permission.has_permission(request, None) is False
    assert "superadmin" in permission.message

    request.user = inactive_user
    assert permission.has_permission(request, None) is False
    assert "no esta activo" in permission.message


def test_file_url_falls_back_when_request_host_is_disallowed():
    class FileField:
        url = "/media/logo.png"

        def __bool__(self):
            return True

    class BadRequest:
        def build_absolute_uri(self, _url):
            raise DisallowedHost("bad host")

    assert file_url(None) is None
    assert file_url(FileField()) == "/media/logo.png"
    assert file_url(FileField(), request=BadRequest()) == "/media/logo.png"


@pytest.mark.django_db
def test_cash_helpers_cover_dates_adjustments_context_and_signed_amounts(default_business, django_user_model):
    aware_datetime = timezone.make_aware(timezone.datetime(2026, 5, 19, 12, 0))
    naive_datetime = timezone.datetime(2026, 5, 19, 12, 0)
    target_day = timezone.datetime(2026, 5, 20).date()
    user = django_user_model.objects.create_user(username="cash-user")

    assert cash_day(aware_datetime) == timezone.localtime(aware_datetime).date()
    assert cash_day(naive_datetime) == naive_datetime.date()
    assert cash_day(target_day) == target_day
    assert cash_day("2026-05-19") is None
    assert request_user_from_context({}) is None
    assert request_user_from_context({"request": type("Request", (), {"user": user})()}) == user
    assert signed_amount_for(CashMovement.MovementType.INCOME, "12.5") == "+12.50"
    assert signed_amount_for(CashMovement.MovementType.EXPENSE, "12.5") == "-12.50"
    ensure_adjustment_target_closed(None, business=default_business)

    with pytest.raises(serializers.ValidationError):
        ensure_adjustment_target_closed(target_day, business=default_business)

    CashClosure.objects.create(
        business=default_business,
        day=target_day,
        total_income=0,
        total_expense=0,
        balance=0,
    )
    ensure_adjustment_target_closed(target_day, business=default_business)


def test_context_can_view_economy_defaults_to_true_without_request():
    assert context_can_view_economy({}) is True


def test_cash_movement_source_kind_distinguishes_stock_movement_types():
    sale = type("Movement", (), {"adjusts_closed_day": None, "payment_id": None, "material_purchase_id": None, "stock_movement_id": 1, "stock_movement": type("Stock", (), {"movement_type": "sale"})()})()
    purchase = type("Movement", (), {"adjusts_closed_day": None, "payment_id": None, "material_purchase_id": None, "stock_movement_id": 2, "stock_movement": type("Stock", (), {"movement_type": "purchase"})()})()
    other = type("Movement", (), {"adjusts_closed_day": None, "payment_id": None, "material_purchase_id": None, "stock_movement_id": 3, "stock_movement": type("Stock", (), {"movement_type": "adjustment"})()})()

    assert cash_movement_source_kind(sale) == "stock_sale"
    assert cash_movement_source_kind(purchase) == "stock_purchase"
    assert cash_movement_source_kind(other) == "stock_movement"
