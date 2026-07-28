"""Canonical onboarding state and its linked task projection.

This module is intentionally write-only from mutation paths.  GET endpoints and
frontend rendering consume the projection but never create or change tasks.
"""

from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Task, TaskOnboardingStep, TaskStatus


ONBOARDING_TASKS = {
    TaskOnboardingStep.BUSINESS: {
        "title": "Negocio listo",
        "description": "Completa nombre, contacto y el link publico del negocio.",
    },
    TaskOnboardingStep.SERVICES: {
        "title": "Servicios vehiculares",
        "description": "Activa servicios de lavadero, detailing y lubricentro.",
    },
    TaskOnboardingStep.TURNERA: {
        "title": "Turnera publica",
        "description": "Activa la landing publica para recibir turnos o consultas.",
    },
    TaskOnboardingStep.WHATSAPP: {
        "title": "WhatsApp operativo",
        "description": "Habilita un canal de WhatsApp con numero visible.",
    },
    TaskOnboardingStep.AGENDA: {
        "title": "Primer turno o trabajo",
        "description": "Registra el primer turno, trabajo o solicitud publica.",
    },
    TaskOnboardingStep.CASH_DASHBOARD: {
        "title": "Primer cobro",
        "description": "Registra un pago o ingreso real del negocio.",
    },
}


def _has_text(value):
    return bool(str(value or "").strip())


def onboarding_states(business):
    """Return the six completion states from persisted business facts only."""
    from catalog.models import Sector, Service
    from core.models import BusinessProfile
    from finance.models import CashMovement, Payment
    from notifications.models import PublicRequest
    from scheduling.models import Reservation
    from whatsapp.models import WhatsAppConfig
    from workorders.models import WorkOrder

    profile = BusinessProfile.get_solo(business=business)
    active_services = Service.objects.filter(
        business=business,
        is_active=True,
        deleted_at__isnull=True,
    )
    sector_keys = set(
        Sector.objects.filter(
            business=business,
            is_active=True,
            deleted_at__isnull=True,
        ).values_list("key", flat=True)
    )
    whatsapp = WhatsAppConfig.objects.filter(business=business).first()
    whatsapp_ready = bool(
        whatsapp
        and whatsapp.is_enabled
        and _has_text(whatsapp.provider)
        and _has_text(whatsapp.phone_number_display)
    )

    return {
        TaskOnboardingStep.BUSINESS: bool(
            _has_text(profile.name)
            and _has_text(business.slug)
            and (_has_text(profile.contact_phone) or _has_text(profile.contact_email))
        ),
        TaskOnboardingStep.SERVICES: (
            active_services.count() >= 3
            and {"lavadero", "detailing", "lubricentro"}.issubset(sector_keys)
        ),
        TaskOnboardingStep.TURNERA: bool(
            profile.public_landing_enabled
            and _has_text(business.slug)
            and active_services.exists()
            and (
                profile.allow_public_booking_requests
                or profile.allow_public_quote_requests
            )
        ),
        TaskOnboardingStep.WHATSAPP: whatsapp_ready,
        TaskOnboardingStep.AGENDA: (
            Reservation.objects.filter(
                business=business,
                deleted_at__isnull=True,
            ).exists()
            or WorkOrder.objects.filter(
                business=business,
                deleted_at__isnull=True,
            ).exists()
            or PublicRequest.objects.filter(business=business).exists()
        ),
        TaskOnboardingStep.CASH_DASHBOARD: (
            Payment.objects.filter(
                business=business,
                deleted_at__isnull=True,
            ).exists()
            or CashMovement.objects.filter(
                business=business,
                movement_type=CashMovement.MovementType.INCOME,
                deleted_at__isnull=True,
            ).exists()
        ),
    }


def _get_or_create_task(business, step_id):
    task = Task.objects.filter(
        business=business,
        onboarding_step_id=step_id,
    ).first()
    if task is not None:
        return task
    try:
        with transaction.atomic():
            return Task.objects.create(
                business=business,
                onboarding_step_id=step_id,
                title=ONBOARDING_TASKS[step_id]["title"],
                description=ONBOARDING_TASKS[step_id]["description"],
            )
    except IntegrityError:
        # The partial unique constraint is the concurrency guard; a competing
        # transaction won the insert, so reuse its active projection.
        return Task.objects.get(business=business, onboarding_step_id=step_id)


def sync_onboarding_tasks(business):
    """Idempotently project current facts into active onboarding tasks."""
    from core.models import BusinessProfile

    states = onboarding_states(business)
    dismissed = set(
        BusinessProfile.get_solo(business=business).onboarding_dismissed_step_ids or []
    )
    tasks = {}
    for step_id in TaskOnboardingStep.values:
        if step_id in dismissed:
            Task.objects.filter(
                business=business,
                onboarding_step_id=step_id,
            ).delete()
            continue
        task = _get_or_create_task(business, step_id)
        should_be_done = states[step_id]
        if should_be_done and task.status != TaskStatus.DONE:
            task.status = TaskStatus.DONE
            task.completed_at = timezone.now()
            task.completed_by = None
            task.save(update_fields=["status", "completed_at", "completed_by", "updated_at"])
        elif not should_be_done and task.status != TaskStatus.PENDING:
            task.status = TaskStatus.PENDING
            task.completed_at = None
            task.completed_by = None
            task.save(update_fields=["status", "completed_at", "completed_by", "updated_at"])
        tasks[step_id] = task
    return tasks


def schedule_onboarding_sync(business):
    """Schedule the projection only after the surrounding business write commits."""
    business_id = getattr(business, "pk", business)
    if not business_id:
        return

    def sync_after_commit():
        from core.models import BusinessAccount

        current_business = BusinessAccount.objects.filter(pk=business_id).first()
        if current_business is not None:
            sync_onboarding_tasks(current_business)

    transaction.on_commit(sync_after_commit)
