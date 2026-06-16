"""Motor de la outbox de notificaciones por email.

`enqueue_email` persiste la notificacion y hace un intento best-effort inline
(con timeout via `settings.EMAIL_TIMEOUT`). `flush_outbox` reintenta las
pendientes/fallidas; tras agotar `max_attempts` la fila pasa a `dead`. Ninguna
de las dos lanza hacia el caller: una falla de mail no debe tumbar el request
que la origino ni el job de mantenimiento.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import NotificationOutbox

logger = logging.getLogger("shineapp.notifications")


def enqueue_email(*, recipient, subject, body, event="", business=None, send_now=True):
    """Persiste un email en la outbox y (por defecto) lo intenta enviar ya."""
    recipient = (recipient or "").strip()
    if not recipient:
        return None
    entry = NotificationOutbox.objects.create(
        kind=NotificationOutbox.Kind.EMAIL,
        event=event,
        recipient=recipient,
        subject=subject,
        body=body,
        business=business,
    )
    if send_now:
        _attempt(entry)
    return entry


def _attempt(entry) -> bool:
    try:
        send_mail(
            entry.subject,
            entry.body,
            settings.DEFAULT_FROM_EMAIL,
            [entry.recipient],
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001 - cualquier fallo de mail va a la outbox
        entry.attempts += 1
        entry.last_error = str(exc)[:2000]
        if entry.attempts >= entry.max_attempts:
            entry.status = NotificationOutbox.Status.DEAD
            logger.error(
                "notificacion descartada tras %s intentos: %s -> %s (%s)",
                entry.attempts,
                entry.event,
                entry.recipient,
                exc,
            )
        else:
            entry.status = NotificationOutbox.Status.FAILED
            logger.warning(
                "fallo envio de notificacion (intento %s): %s -> %s (%s)",
                entry.attempts,
                entry.event,
                entry.recipient,
                exc,
            )
        entry.save(update_fields=["attempts", "last_error", "status", "updated_at"])
        return False
    entry.status = NotificationOutbox.Status.SENT
    entry.sent_at = timezone.now()
    entry.attempts += 1
    entry.save(update_fields=["status", "sent_at", "attempts", "updated_at"])
    return True


def flush_outbox(limit: int = 100) -> dict:
    """Reintenta las notificaciones pendientes/fallidas. Idempotente."""
    pending = list(
        NotificationOutbox.objects.filter(
            status__in=[
                NotificationOutbox.Status.PENDING,
                NotificationOutbox.Status.FAILED,
            ],
        ).order_by("created_at", "id")[:limit]
    )
    sent = failed = 0
    for entry in pending:
        if _attempt(entry):
            sent += 1
        else:
            failed += 1
    result = {"processed": len(pending), "sent": sent, "failed": failed}
    if pending:
        logger.info("outbox flush: %s", result)
    return result
