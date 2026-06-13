"""Regresiones de seguridad — Fase 2.

Cubre: expiracion absoluta del token, invalidacion de tokens en password reset,
y lockout de cuenta por intentos fallidos de login.
"""

from datetime import timedelta

import pytest
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from core.models import PasswordResetToken, UserProfile


def make_employer(django_user_model, business, username, password="rightpass123"):
    user = django_user_model.objects.create_user(username=username, password=password, email=f"{username}@e.com")
    group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(group)
    UserProfile.objects.create(user=user, business=business)
    return user


# ---------------------------------------------------------------------------
# Expiracion absoluta del token.
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_expired_token_is_rejected(default_business, django_user_model):
    user = make_employer(django_user_model, default_business, "tok-exp")
    token = Token.objects.create(user=user)
    Token.objects.filter(pk=token.pk).update(created=timezone.now() - timedelta(seconds=10))

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    with override_settings(AUTH_TOKEN_TTL_SECONDS=1):
        resp = client.get(reverse("auth-me"))

    assert resp.status_code == 401
    assert not Token.objects.filter(pk=token.pk).exists()


@pytest.mark.django_db
def test_fresh_token_is_accepted(default_business, django_user_model):
    user = make_employer(django_user_model, default_business, "tok-fresh")
    token = Token.objects.create(user=user)

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    with override_settings(AUTH_TOKEN_TTL_SECONDS=3600):
        resp = client.get(reverse("auth-me"))

    assert resp.status_code == 200


@pytest.mark.django_db
def test_ttl_zero_disables_expiration(default_business, django_user_model):
    user = make_employer(django_user_model, default_business, "tok-noexp")
    token = Token.objects.create(user=user)
    Token.objects.filter(pk=token.pk).update(created=timezone.now() - timedelta(days=365))

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    with override_settings(AUTH_TOKEN_TTL_SECONDS=0):
        resp = client.get(reverse("auth-me"))

    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Password reset invalida los tokens de API.
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_password_reset_confirm_invalidates_api_tokens(default_business, django_user_model):
    user = make_employer(django_user_model, default_business, "reset-me", password="oldpass123")
    token = Token.objects.create(user=user)
    PasswordResetToken.objects.create(
        user=user,
        token="resettok-abc-123",
        expires_at=timezone.now() + timedelta(hours=1),
    )

    client = APIClient()
    resp = client.post(
        reverse("auth-password-reset-confirm"),
        {"token": "resettok-abc-123", "new_password": "BrandNewPass123"},
        format="json",
    )

    assert resp.status_code == 200
    assert not Token.objects.filter(pk=token.pk).exists()


# ---------------------------------------------------------------------------
# Lockout de cuenta por intentos fallidos.
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_login_lockout_after_threshold(default_business, django_user_model):
    make_employer(django_user_model, default_business, "lock-me", password="rightpass123")
    cache.clear()
    client = APIClient()
    url = reverse("auth-login")

    with override_settings(LOGIN_LOCKOUT_THRESHOLD=3, LOGIN_LOCKOUT_WINDOW_SECONDS=900):
        for _ in range(3):
            bad = client.post(url, {"username": "lock-me", "password": "wrong"}, format="json")
            assert bad.status_code == 400
        # Aun con la password correcta, queda bloqueado.
        blocked = client.post(url, {"username": "lock-me", "password": "rightpass123"}, format="json")
        assert blocked.status_code == 429
    cache.clear()


@pytest.mark.django_db
def test_login_success_clears_lockout_counter(default_business, django_user_model):
    make_employer(django_user_model, default_business, "clear-me", password="rightpass123")
    cache.clear()
    client = APIClient()
    url = reverse("auth-login")

    with override_settings(LOGIN_LOCKOUT_THRESHOLD=5, LOGIN_LOCKOUT_WINDOW_SECONDS=900):
        for _ in range(2):
            client.post(url, {"username": "clear-me", "password": "wrong"}, format="json")
        ok = client.post(url, {"username": "clear-me", "password": "rightpass123"}, format="json")
        assert ok.status_code == 200
        from config.views import login_lockout_key

        assert cache.get(login_lockout_key("clear-me")) in (None, 0)
    cache.clear()
