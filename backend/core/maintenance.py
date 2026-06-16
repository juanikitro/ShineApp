"""Jobs de mantenimiento idempotentes.

Invocables por el endpoint interno (`/api/internal/maintenance/`, disparado por
el cron de GitHub Actions) o por management commands. Cada job es idempotente,
loguea su resultado y devuelve un dict de contadores. La purga de papelera es
destructiva, asi que solo borra de verdad cuando `apply=True`; en cualquier otro
caso reporta cuanto seria elegible (modo dry-run).
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger("shineapp.maintenance")


def flush_notifications(limit: int = 200) -> dict:
    from notifications.outbox import flush_outbox

    return flush_outbox(limit=limit)


def materialize_fixed_expenses() -> dict:
    from fixed_expenses.materialization import materialize_due

    created = materialize_due()
    return {"occurrences_created": created}


def prune_password_reset_tokens() -> dict:
    from core.models import PasswordResetToken

    now = timezone.now()
    queryset = PasswordResetToken.objects.filter(Q(used=True) | Q(expires_at__lt=now))
    deleted = queryset.count()
    queryset.delete()
    return {"tokens_deleted": deleted}


def prune_push_subscriptions() -> dict:
    # Las suscripciones muertas se limpian inline cuando el navegador devuelve
    # 404/410 (ver notifications.service). Este job solo reporta cuantas quedan
    # activas, util para detectar acumulacion anomala.
    from core.models import UserProfile

    active = UserProfile.objects.exclude(push_subscription__isnull=True).count()
    return {"active_push_subscriptions": active}


def purge_trash(*, older_than_days=None, apply: bool = False) -> dict:
    from core.trash import get_trash_registry

    days = older_than_days if older_than_days is not None else settings.TRASH_RETENTION_DAYS
    cutoff = timezone.now() - timedelta(days=days)
    summary = {
        "cutoff": cutoff.isoformat(),
        "older_than_days": days,
        "applied": apply,
        "eligible": 0,
        "purged": 0,
        "blocked": 0,
        "by_type": {},
    }
    for entry in get_trash_registry():
        rows = entry.model.all_objects.filter(
            deleted_at__isnull=False, deleted_at__lt=cutoff
        )
        eligible = rows.count()
        purged = blocked = 0
        if apply and eligible:
            for instance in list(rows):
                try:
                    instance.hard_delete()
                    purged += 1
                except Exception:
                    blocked += 1
                    logger.warning(
                        "purge_trash bloqueado por relaciones: %s#%s", entry.key, instance.pk
                    )
        summary["by_type"][entry.key] = {
            "eligible": eligible,
            "purged": purged,
            "blocked": blocked,
        }
        summary["eligible"] += eligible
        summary["purged"] += purged
        summary["blocked"] += blocked
    return summary


def run_all(*, purge_apply: bool = False) -> dict:
    """Corre todos los jobs en orden seguro. Nunca lanza."""
    results = {}
    for name, job in (
        ("notifications", lambda: flush_notifications()),
        ("fixed_expenses", lambda: materialize_fixed_expenses()),
        ("password_reset_tokens", lambda: prune_password_reset_tokens()),
        ("push_subscriptions", lambda: prune_push_subscriptions()),
        ("trash", lambda: purge_trash(apply=purge_apply)),
    ):
        try:
            results[name] = job()
        except Exception as exc:  # noqa: BLE001 - un job no debe tumbar al resto
            logger.exception("job de mantenimiento '%s' fallo", name)
            results[name] = {"error": str(exc)[:500]}
    logger.info("maintenance run: %s", results)
    return results
