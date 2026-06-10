import importlib

import pytest
from django.contrib.auth.models import Group
from django.test import override_settings
from django.urls import reverse

from core.models import UserProfile


@pytest.mark.django_db
def test_employer_cannot_create_employee_with_short_initial_password(api_client, django_user_model):
    response = api_client.post(
        reverse("auth-employees"),
        {
            "username": "operario-corto",
            "email": "operario-corto@example.com",
            "password": "corta1",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "password" in response.data
    assert not django_user_model.objects.filter(username="operario-corto").exists()


@pytest.mark.django_db
def test_employee_creation_uses_django_password_validators(api_client, django_user_model):
    from config import settings as base_settings

    with override_settings(
        AUTH_PASSWORD_VALIDATORS=base_settings.STANDARD_PASSWORD_VALIDATORS,
    ):
        response = api_client.post(
            reverse("auth-employees"),
            {
                "username": "operario-numerico",
                "email": "operario-numerico@example.com",
                "password": "12345678",
            },
            format="json",
        )

    assert response.status_code == 400
    assert "password" in response.data
    assert not django_user_model.objects.filter(username="operario-numerico").exists()


@pytest.mark.django_db
def test_patch_employee_password_invalidates_employee_token(api_client, django_user_model, default_business):
    from django.contrib.auth.models import Group
    from rest_framework.authtoken.models import Token
    from core.models import UserProfile

    employee = django_user_model.objects.create_user(
        username="empleado-token-test",
        password="oldpassword123",
    )
    employee_group, _ = Group.objects.get_or_create(name="empleado")
    employee.groups.add(employee_group)
    UserProfile.objects.get_or_create(user=employee, defaults={"business": default_business})
    employee_token = Token.objects.create(user=employee)

    response = api_client.patch(
        reverse("auth-employee-detail", kwargs={"pk": employee.pk}),
        {"password": "newpassword456"},
        format="json",
    )

    assert response.status_code == 200
    assert not Token.objects.filter(pk=employee_token.pk).exists()


@pytest.mark.django_db
def test_patch_employee_active_does_not_invalidate_token(api_client, django_user_model, default_business):
    from django.contrib.auth.models import Group
    from rest_framework.authtoken.models import Token
    from core.models import UserProfile

    employee = django_user_model.objects.create_user(
        username="empleado-active-test",
        password="somepassword123",
    )
    employee_group, _ = Group.objects.get_or_create(name="empleado")
    employee.groups.add(employee_group)
    UserProfile.objects.get_or_create(user=employee, defaults={"business": default_business})
    employee_token = Token.objects.create(user=employee)

    response = api_client.patch(
        reverse("auth-employee-detail", kwargs={"pk": employee.pk}),
        {"is_active": False},
        format="json",
    )

    assert response.status_code == 200
    assert not response.data["is_active"]
    assert Token.objects.filter(pk=employee_token.pk).exists()


def test_production_settings_enable_standard_password_validators(monkeypatch):
    monkeypatch.setenv("DJANGO_SECRET_KEY", "x" * 60)
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "shineapp-api.example.com")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://shineapp-web.example.com")
    monkeypatch.setenv("CSRF_TRUSTED_ORIGINS", "https://shineapp-web.example.com")
    monkeypatch.setenv("DATABASE_URL", "postgres://shineapp:shineapp@localhost:5432/shineapp")
    monkeypatch.setenv("SUPABASE_STORAGE_ENABLED", "0")

    production_settings = importlib.import_module("config.settings_production")
    production_settings = importlib.reload(production_settings)

    assert production_settings.AUTH_PASSWORD_VALIDATORS == production_settings.STANDARD_PASSWORD_VALIDATORS
    assert [item["NAME"] for item in production_settings.AUTH_PASSWORD_VALIDATORS] == [
        "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
        "django.contrib.auth.password_validation.MinimumLengthValidator",
        "django.contrib.auth.password_validation.CommonPasswordValidator",
        "django.contrib.auth.password_validation.NumericPasswordValidator",
    ]


@pytest.mark.django_db
def test_employer_can_change_employee_password(api_client, django_user_model, default_business):
    employee_group, _ = Group.objects.get_or_create(name="empleado")
    employee = django_user_model.objects.create_user(username="emp-pw-test", password="oldpassword1")
    employee.groups.set([employee_group])
    UserProfile.objects.create(user=employee, business=default_business)

    response = api_client.patch(
        reverse("auth-employee-detail", kwargs={"pk": employee.pk}),
        {"password": "newpassword1"},
        format="json",
    )

    assert response.status_code == 200
    employee.refresh_from_db()
    assert employee.check_password("newpassword1")


@pytest.mark.django_db
def test_employer_cannot_change_password_to_too_short(api_client, django_user_model, default_business):
    employee_group, _ = Group.objects.get_or_create(name="empleado")
    employee = django_user_model.objects.create_user(username="emp-short-pw", password="oldpassword1")
    employee.groups.set([employee_group])
    UserProfile.objects.create(user=employee, business=default_business)

    response = api_client.patch(
        reverse("auth-employee-detail", kwargs={"pk": employee.pk}),
        {"password": "corta"},
        format="json",
    )

    assert response.status_code == 400
    assert "password" in response.data


@pytest.mark.django_db
def test_employee_cannot_change_other_employee_password(employee_client, django_user_model, default_business):
    employee_group, _ = Group.objects.get_or_create(name="empleado")
    other = django_user_model.objects.create_user(username="emp-other", password="otherpass1")
    other.groups.set([employee_group])
    UserProfile.objects.create(user=other, business=default_business)

    response = employee_client.patch(
        reverse("auth-employee-detail", kwargs={"pk": other.pk}),
        {"password": "newpassword1"},
        format="json",
    )

    assert response.status_code == 403
