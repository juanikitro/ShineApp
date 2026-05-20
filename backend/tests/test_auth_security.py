import importlib

import pytest
from django.test import override_settings
from django.urls import reverse


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
