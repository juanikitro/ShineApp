"""Tests de operabilidad: request_id, exception handler, outbox, mantenimiento,
constraints de integridad y health check profundo."""

from decimal import Decimal
from unittest.mock import patch

import pytest
from django.core import mail
from django.db import IntegrityError, transaction
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient


HEALTH_URL = "/api/health/"
MAINTENANCE_URL = "/api/internal/maintenance/"


# ─── request_id / correlación ─────────────────────────────────────────────────

@pytest.mark.django_db
def test_health_ok_includes_request_id_header():
    response = APIClient().get(HEALTH_URL)
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID")
    assert response.data["checks"]["database"] == "ok"


@pytest.mark.django_db
def test_incoming_request_id_is_echoed():
    response = APIClient().get(HEALTH_URL, **{"HTTP_X_REQUEST_ID": "trace-abc-123"})
    assert response.headers.get("X-Request-ID") == "trace-abc-123"


@pytest.mark.django_db
def test_health_deep_checks_storage():
    response = APIClient().get(HEALTH_URL, {"deep": "1"})
    assert response.status_code == 200
    assert response.data["checks"]["storage"] == "ok"


# ─── exception handler ────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_validation_error_keeps_field_shape_and_sets_request_id_header():
    # trial-signup con body vacío => errores por campo (no "detail").
    response = APIClient().post(reverse("auth-trial-signup"), {}, format="json")
    assert response.status_code == 400
    assert response.headers.get("X-Request-ID")
    # El body sigue siendo por-campo: no se contamina con claves meta.
    assert "detail" not in response.data
    assert any(field in response.data for field in ("email", "business_name", "owner_name"))


def test_exception_handler_wraps_unhandled_as_internal_error():
    from core.exceptions import api_exception_handler

    response = api_exception_handler(RuntimeError("boom"), {"request": None})
    assert response.status_code == 500
    assert response.data["error_code"] == "internal_error"
    assert "detail" in response.data
    # No filtra el mensaje crudo de la excepción.
    assert "boom" not in response.data["detail"]


# ─── endpoint de mantenimiento ────────────────────────────────────────────────

@pytest.mark.django_db
def test_maintenance_disabled_without_secret():
    with override_settings(CRON_SECRET=""):
        response = APIClient().post(MAINTENANCE_URL)
    assert response.status_code == 503
    assert response.data["error_code"] == "maintenance_disabled"


@pytest.mark.django_db
def test_maintenance_forbidden_with_wrong_token():
    with override_settings(CRON_SECRET="s3cret-token-value"):
        response = APIClient().post(MAINTENANCE_URL, **{"HTTP_X_CRON_TOKEN": "nope"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_maintenance_runs_with_valid_token():
    with override_settings(CRON_SECRET="s3cret-token-value"):
        response = APIClient().post(
            MAINTENANCE_URL, **{"HTTP_X_CRON_TOKEN": "s3cret-token-value"}
        )
    assert response.status_code == 200
    results = response.data["results"]
    for key in ("notifications", "fixed_expenses", "password_reset_tokens", "trash"):
        assert key in results


# ─── outbox de notificaciones ─────────────────────────────────────────────────

@pytest.mark.django_db
def test_enqueue_email_sends_and_marks_sent():
    from notifications.models import NotificationOutbox
    from notifications.outbox import enqueue_email

    mail.outbox.clear()
    entry = enqueue_email(recipient="cliente@test.com", subject="Hola", body="cuerpo", event="t")
    entry.refresh_from_db()
    assert entry.status == NotificationOutbox.Status.SENT
    assert entry.sent_at is not None
    assert len(mail.outbox) == 1


@pytest.mark.django_db
def test_enqueue_email_failure_then_flush_retries():
    from notifications.models import NotificationOutbox
    from notifications.outbox import enqueue_email, flush_outbox

    mail.outbox.clear()
    with patch("notifications.outbox.send_mail", side_effect=Exception("SMTP caido")):
        entry = enqueue_email(recipient="cliente@test.com", subject="Hola", body="cuerpo")
    entry.refresh_from_db()
    assert entry.status == NotificationOutbox.Status.FAILED
    assert entry.attempts == 1
    assert len(mail.outbox) == 0

    # Sin el SMTP roto, el flush la reintenta y la manda.
    result = flush_outbox()
    entry.refresh_from_db()
    assert entry.status == NotificationOutbox.Status.SENT
    assert result["sent"] == 1
    assert len(mail.outbox) == 1


@pytest.mark.django_db
def test_enqueue_email_skips_empty_recipient():
    from notifications.outbox import enqueue_email

    assert enqueue_email(recipient="", subject="x", body="y") is None


# ─── constraints de integridad ────────────────────────────────────────────────

@pytest.mark.django_db
def test_debt_principal_amount_must_be_positive():
    from debts.models import Debt

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Debt.objects.create(concept="Deuda invalida", principal_amount=Decimal("0"))


@pytest.mark.django_db
def test_cash_movement_amount_cannot_be_negative():
    from finance.models import CashMovement

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            CashMovement.objects.create(
                movement_type=CashMovement.MovementType.INCOME,
                category="Ventas",
                amount=Decimal("-1"),
            )
