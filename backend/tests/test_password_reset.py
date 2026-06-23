"""Tests para el flujo de reset de contraseña por email.

Cubre:
- POST /api/auth/password-reset/ con email existente -> 200 + email enviado
- POST /api/auth/password-reset/ con email inexistente -> 200 (respuesta idéntica)
- POST /api/auth/password-reset/confirm/ con token válido -> 200, contraseña actualizada, token marcado como used
- POST /api/auth/password-reset/confirm/ con token vencido -> 400
- POST /api/auth/password-reset/confirm/ con token ya usado -> 400
- POST /api/auth/password-reset/confirm/ con token inválido -> 400
- POST /api/auth/password-reset/confirm/ con contraseña débil -> 400
"""
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import PasswordResetToken

RESET_URL = "/api/auth/password-reset/"
CONFIRM_URL = "/api/auth/password-reset/confirm/"
SAFE_DETAIL = "Si el email existe, recibirás un link."


def make_user(email="usuario@test.com", password="ClaveSegura123!"):
    user_model = get_user_model()
    return user_model.objects.create_user(
        username=email,
        email=email,
        password=password,
    )


def make_valid_token(user, hours_offset=1):
    return PasswordResetToken.objects.create(
        user=user,
        token="token-valido-123",
        expires_at=timezone.now() + timedelta(hours=hours_offset),
    )


# ─── POST /api/auth/password-reset/ ───────────────────────────────────────────

@pytest.mark.django_db
def test_password_reset_request_existing_email_returns_200(mailoutbox):
    user = make_user("dueno@shineapp.test")
    client = APIClient()

    response = client.post(RESET_URL, {"email": user.email}, format="json")

    assert response.status_code == 200
    assert response.data["detail"] == SAFE_DETAIL


@pytest.mark.django_db
def test_password_reset_request_existing_email_sends_email(mailoutbox):
    user = make_user("dueno2@shineapp.test")
    client = APIClient()

    client.post(RESET_URL, {"email": user.email}, format="json")

    assert len(mailoutbox) == 1
    sent = mailoutbox[0]
    assert sent.to == [user.email]
    assert "reset" in sent.subject.lower() or "contrase" in sent.subject.lower()
    assert "shineapp-web.vercel.app/reset-password?token=" in sent.body


@pytest.mark.django_db
def test_password_reset_request_creates_token_in_db():
    user = make_user("tokendb@shineapp.test")
    client = APIClient()

    client.post(RESET_URL, {"email": user.email}, format="json")

    token = PasswordResetToken.objects.filter(user=user).first()
    assert token is not None
    assert not token.used
    assert token.expires_at > timezone.now()


@pytest.mark.django_db
def test_password_reset_request_nonexistent_email_returns_200(mailoutbox):
    client = APIClient()

    response = client.post(RESET_URL, {"email": "noexiste@shineapp.test"}, format="json")

    assert response.status_code == 200
    assert response.data["detail"] == SAFE_DETAIL
    assert len(mailoutbox) == 0


@pytest.mark.django_db
def test_password_reset_request_nonexistent_email_identical_response_to_existing():
    """La respuesta para email inexistente es idéntica a la de email existente."""
    user = make_user("existe@shineapp.test")
    client = APIClient()

    r_exists = client.post(RESET_URL, {"email": user.email}, format="json")
    r_not_exists = client.post(RESET_URL, {"email": "noexiste@shineapp.test"}, format="json")

    assert r_exists.status_code == r_not_exists.status_code
    assert r_exists.data == r_not_exists.data


@pytest.mark.django_db
def test_password_reset_request_smtp_failure_still_returns_200():
    user = make_user("smtp@shineapp.test")
    client = APIClient()

    with patch("notifications.outbox.send_mail", side_effect=Exception("SMTP error")):
        response = client.post(RESET_URL, {"email": user.email}, format="json")

    assert response.status_code == 200
    assert response.data["detail"] == SAFE_DETAIL


# ─── POST /api/auth/password-reset/confirm/ ───────────────────────────────────

@pytest.mark.django_db
def test_password_reset_confirm_valid_token_returns_200():
    user = make_user("confirm@shineapp.test")
    token = make_valid_token(user)
    client = APIClient()

    response = client.post(
        CONFIRM_URL,
        {"token": token.token, "new_password": "NuevaClave456!"},
        format="json",
    )

    assert response.status_code == 200
    assert "Contraseña" in response.data["detail"] or "actualizada" in response.data["detail"]


@pytest.mark.django_db
def test_password_reset_confirm_valid_token_updates_password():
    user = make_user("pass@shineapp.test", password="ViejaContra123!")
    token = make_valid_token(user)
    client = APIClient()

    client.post(
        CONFIRM_URL,
        {"token": token.token, "new_password": "NuevaClave456!"},
        format="json",
    )

    user.refresh_from_db()
    assert user.check_password("NuevaClave456!")
    assert not user.check_password("ViejaContra123!")


@pytest.mark.django_db
def test_password_reset_confirm_valid_token_marks_token_as_used():
    user = make_user("used@shineapp.test")
    token = make_valid_token(user)
    client = APIClient()

    client.post(
        CONFIRM_URL,
        {"token": token.token, "new_password": "NuevaClave456!"},
        format="json",
    )

    token.refresh_from_db()
    assert token.used is True


@pytest.mark.django_db
def test_password_reset_confirm_expired_token_returns_400():
    user = make_user("expired@shineapp.test")
    expired_token = PasswordResetToken.objects.create(
        user=user,
        token="token-vencido-abc",
        expires_at=timezone.now() - timedelta(hours=1),
    )
    client = APIClient()

    response = client.post(
        CONFIRM_URL,
        {"token": expired_token.token, "new_password": "NuevaClave456!"},
        format="json",
    )

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_password_reset_confirm_already_used_token_returns_400():
    user = make_user("alreadyused@shineapp.test")
    used_token = PasswordResetToken.objects.create(
        user=user,
        token="token-usado-xyz",
        expires_at=timezone.now() + timedelta(hours=1),
        used=True,
    )
    client = APIClient()

    response = client.post(
        CONFIRM_URL,
        {"token": used_token.token, "new_password": "NuevaClave456!"},
        format="json",
    )

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_password_reset_confirm_invalid_token_returns_400():
    client = APIClient()

    response = client.post(
        CONFIRM_URL,
        {"token": "token-que-no-existe", "new_password": "NuevaClave456!"},
        format="json",
    )

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_password_reset_confirm_weak_password_returns_400():
    user = make_user("weak@shineapp.test")
    token = make_valid_token(user)
    client = APIClient()

    response = client.post(
        CONFIRM_URL,
        {"token": token.token, "new_password": "123"},
        format="json",
    )

    assert response.status_code == 400
    assert "new_password" in response.data


@pytest.mark.django_db
def test_password_reset_confirm_missing_token_returns_400():
    client = APIClient()

    response = client.post(
        CONFIRM_URL,
        {"new_password": "NuevaClave456!"},
        format="json",
    )

    assert response.status_code == 400
    assert "token" in response.data


# ─── PasswordResetToken.is_valid() ────────────────────────────────────────────

@pytest.mark.django_db
def test_password_reset_token_is_valid_returns_true_for_fresh_token():
    user = make_user("fresh@shineapp.test")
    token = make_valid_token(user)
    assert token.is_valid() is True


@pytest.mark.django_db
def test_password_reset_token_is_valid_returns_false_for_expired():
    user = make_user("expiredvalid@shineapp.test")
    token = PasswordResetToken.objects.create(
        user=user,
        token="token-expired-v",
        expires_at=timezone.now() - timedelta(seconds=1),
    )
    assert token.is_valid() is False


@pytest.mark.django_db
def test_password_reset_token_is_valid_returns_false_for_used():
    user = make_user("usedvalid@shineapp.test")
    token = PasswordResetToken.objects.create(
        user=user,
        token="token-used-v",
        expires_at=timezone.now() + timedelta(hours=1),
        used=True,
    )
    assert token.is_valid() is False
