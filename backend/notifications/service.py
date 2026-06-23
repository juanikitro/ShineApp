"""Servicio de notificaciones (email + web push).

Los emails ya no se mandan con `send_mail` directo: se encolan en la
`NotificationOutbox` (`enqueue_email`), que persiste el aviso, lo intenta enviar
best-effort inline con timeout y lo reintenta via el job de mantenimiento si
falla. Asi ningun mail al cliente se pierde en silencio.

El web push sigue siendo inline y best-effort (re-entregar un push viejo no
aporta), pero con timeout explicito, limpieza de suscripciones muertas (404/410)
y defensa anti-SSRF: solo se manda a endpoints https publicos (el endpoint lo
provee el cliente via push_subscription).
"""

import ipaddress
import json
import logging
from urllib.parse import urlparse

from django.conf import settings

from .outbox import enqueue_email

logger = logging.getLogger("shineapp.notifications")


def _frontend_url(path: str = "") -> str:
    base = getattr(settings, "FRONTEND_BASE_URL", "https://shineapp-web.vercel.app")
    if not path:
        return base
    return f"{base}/{path.lstrip('/')}"


def _is_public_https_endpoint(endpoint):
    """True si el endpoint de push es https y apunta a un host publico.

    Defensa anti-SSRF: el endpoint lo provee el cliente (push_subscription). Se
    rechazan esquemas no-https, localhost e IPs privadas/loopback/link-local
    (p.ej. 169.254.169.254). Los servicios reales (FCM, Mozilla, WNS, Apple) son
    dominios https publicos, asi que no se ven afectados.
    """
    try:
        parsed = urlparse(endpoint or "")
    except Exception:
        return False
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    host = parsed.hostname.lower()
    if host == "localhost" or host.endswith(".local"):
        return False
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return True  # es un dominio https publico
    return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved)


def _push_subscription_allowed(subscription):
    endpoint = subscription.get("endpoint", "") if isinstance(subscription, dict) else ""
    return _is_public_https_endpoint(endpoint)


def _send_customer_email(customer, subject, body, *, event=""):
    if not customer.email:
        return False
    enqueue_email(
        recipient=customer.email,
        subject=subject,
        body=body,
        event=event,
        business=getattr(customer, "business", None),
    )
    return True


def send_trial_welcome_email(owner_email, business_name):
    """Encola el email de bienvenida al owner tras el trial signup."""
    subject = "Bienvenido a ShineApp — tu prueba gratuita est\xe1 lista"
    body = (
        f"Hola,\n\n"
        f"Tu negocio \"{business_name}\" ya est\xe1 listo en ShineApp.\n\n"
        f"Accede aqu\xed: {_frontend_url()}\n\n"
        f"Si ten\xe9s alguna duda, escrib\xednos a soporte@shineapp.com.ar\n\n"
        f"Bienvenido al equipo ShineApp."
    )
    return enqueue_email(
        recipient=owner_email,
        subject=subject,
        body=body,
        event="trial_welcome",
    )


def send_reservation_confirmation(reservation):
    body = (
        f"Hola {reservation.customer.name}, confirmamos tu reserva para el "
        f"{reservation.day:%d/%m/%Y} por el servicio {reservation.service.name}."
    )
    return _send_customer_email(
        reservation.customer,
        "Reserva confirmada",
        body,
        event="reservation_confirmation",
    )


def send_work_order_ready(work_order):
    body = (
        f"Hola {work_order.customer.name}, tu {work_order.vehicle} ya esta listo "
        f"para retirar. Servicio: {work_order.service.name}."
    )
    return _send_customer_email(
        work_order.customer,
        "Tu vehiculo esta listo",
        body,
        event="work_order_ready",
    )


def send_task_assignment_email(task, assignee):
    email = (getattr(assignee, "email", "") or "").strip()
    if not email:
        return False
    due_label = f" para el {task.due_date:%d/%m/%Y}" if task.due_date else ""
    body_lines = [
        f"Hola {assignee.get_full_name().strip() or assignee.username},",
        "",
        f"Te asignaron la tarea \"{task.title}\"{due_label}.",
    ]
    if task.description:
        body_lines.extend(["", task.description.strip()])
    body_lines.extend(["", "Podes verla en ShineApp."])
    body = "\n".join(body_lines)
    subject = f"Nueva tarea asignada: {task.title}"
    return enqueue_email(
        recipient=email,
        subject=subject,
        body=body,
        event="task_assignment",
        business=getattr(task, "business", None),
    )


def send_new_public_request_notification(public_request):
    """Encola un email por cada usuario del negocio al llegar una solicitud publica."""
    emails = list(
        public_request.business.user_profiles.select_related("user").values_list(
            "user__email", flat=True
        )
    )
    emails = [email for email in emails if email]
    if not emails:
        return False

    request_type_label = "turno" if public_request.request_type == "booking" else "cotizacion"
    service_names = ", ".join(
        item.service.name
        for item in public_request.items.select_related("service").all()
        if item.service
    )
    day_part = (
        f" para el {public_request.preferred_day:%d/%m/%Y}" if public_request.preferred_day else ""
    )
    time_part = (
        f" a las {public_request.preferred_time:%H:%M}" if public_request.preferred_time else ""
    )

    subject = f"Nueva solicitud de {request_type_label} — {public_request.customer_name}"
    body = (
        f"Hola,\n\n"
        f"Recibiste una nueva solicitud de {request_type_label}"
        f"{day_part}{time_part}.\n\n"
        f"Cliente: {public_request.customer_name}\n"
        f"Telefono: {public_request.customer_phone or '—'}\n"
        f"Email: {public_request.customer_email or '—'}\n"
        f"Vehiculo: {public_request.vehicle_license_plate or '—'} "
        f"{public_request.vehicle_brand or ''} {public_request.vehicle_model or ''}\n"
        f"Servicios: {service_names or '—'}\n"
    )
    if public_request.message:
        body += f"Mensaje: {public_request.message}\n"
    body += f"\nPod\xe9s gestionarla desde tu bandeja en ShineApp:\n{_frontend_url()}\n\nEl equipo ShineApp."

    queued = 0
    for email in emails:
        if enqueue_email(
            recipient=email,
            subject=subject,
            body=body,
            event="public_request_new",
            business=public_request.business,
        ):
            queued += 1
    return queued > 0


def _webpush(subscription_info, payload):
    """Envia un push con timeout. Devuelve (enviado, suscripcion_muerta).

    Aplica la defensa anti-SSRF (`_push_subscription_allowed`): un endpoint no
    permitido se trata como no-enviado (sin marcarlo muerto).
    """
    private_key = getattr(settings, "VAPID_PRIVATE_KEY", "")
    if not private_key or not subscription_info:
        return False, False
    if not _push_subscription_allowed(subscription_info):
        logger.warning("push omitido: endpoint no permitido (anti-SSRF)")
        return False, False
    vapid_claims = {"sub": getattr(settings, "VAPID_CLAIMS_EMAIL", "mailto:no-reply@shineapp.local")}
    timeout = getattr(settings, "PUSH_TIMEOUT_SECONDS", 10)
    try:
        from pywebpush import webpush  # noqa: PLC0415

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=private_key,
            vapid_claims=vapid_claims,
            timeout=timeout,
        )
        return True, False
    except Exception as exc:  # noqa: BLE001
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        dead = status_code in (404, 410)
        logger.warning("push fallo (status=%s, dead=%s): %s", status_code, dead, exc)
        return False, dead


def send_business_push_notification(public_request):
    """Push a los usuarios del negocio al llegar una solicitud publica.

    Limpia las suscripciones que el navegador reporta como muertas (404/410) para
    no reintentarlas indefinidamente. El filtrado anti-SSRF ocurre en `_webpush`.
    """
    if not getattr(settings, "VAPID_PRIVATE_KEY", ""):
        return False

    from core.models import UserProfile  # noqa: PLC0415

    profiles = list(
        public_request.business.user_profiles.exclude(push_subscription__isnull=True).only(
            "id", "push_subscription"
        )
    )
    if not profiles:
        return False

    request_type_label = "turno" if public_request.request_type == "booking" else "cotizacion"
    payload = json.dumps(
        {
            "title": f"Nueva solicitud de {request_type_label}",
            "body": f"{public_request.customer_name} pidi\xf3 un {request_type_label}.",
        }
    )

    sent_any = False
    for profile in profiles:
        sent, dead = _webpush(profile.push_subscription, payload)
        sent_any = sent_any or sent
        if dead:
            UserProfile.objects.filter(pk=profile.id).update(push_subscription=None)
    return sent_any


def send_public_request_push(public_request):
    """Push al cliente cuando el negocio confirma el turno."""
    if not public_request.push_subscription:
        return False
    payload = json.dumps(
        {
            "title": "Turno confirmado",
            "body": f"Hola {public_request.customer_name}, tu turno fue confirmado.",
        }
    )
    sent, dead = _webpush(public_request.push_subscription, payload)
    if dead:
        type(public_request).objects.filter(pk=public_request.id).update(push_subscription=None)
    return sent


def send_password_reset_email(user_email, reset_token):
    """Encola el link de reset de contrasena al usuario."""
    reset_url = _frontend_url(f"reset-password?token={reset_token}")
    subject = "ShineApp — Recuperaci\xf3n de contrase\xf1a"
    body = (
        f"Hola,\n\n"
        f"Recibimos una solicitud para restablecer la contrase\xf1a de tu cuenta en ShineApp.\n\n"
        f"Hac\xe9 clic en el siguiente link para crear una nueva contrase\xf1a (v\xe1lido por 1 hora):\n\n"
        f"{reset_url}\n\n"
        f"Si no solicitaste este cambio, ignor\xe1 este email.\n\n"
        f"El equipo ShineApp."
    )
    return enqueue_email(
        recipient=user_email,
        subject=subject,
        body=body,
        event="password_reset",
    )
