import json
import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _send_customer_email(customer, subject, body):
    if not customer.email:
        return False
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [customer.email], fail_silently=True)
    return True


def send_trial_welcome_email(owner_email, business_name):
    """Envia email de bienvenida al owner al completar el trial signup.

    No lanza excepcion si el envio falla; el error se registra en el logger.
    Devuelve True si el envio fue exitoso, False en caso contrario.
    """
    subject = "Bienvenido a ShineApp — tu prueba gratuita est\xe1 lista"
    body = (
        f"Hola,\n\n"
        f"Tu negocio \"{business_name}\" ya est\xe1 listo en ShineApp.\n\n"
        f"Accede aqu\xed: https://shineapp-web.vercel.app\n\n"
        f"Si ten\xe9s alguna duda, escrib\xednos a soporte@shineapp.com.ar\n\n"
        f"Bienvenido al equipo ShineApp."
    )
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [owner_email], fail_silently=False)
        return True
    except Exception:
        logger.exception("No se pudo enviar el email de bienvenida a %s", owner_email)
        return False


def send_reservation_confirmation(reservation):
    body = (
        f"Hola {reservation.customer.name}, confirmamos tu reserva para el "
        f"{reservation.day:%d/%m/%Y} por el servicio {reservation.service.name}."
    )
    return _send_customer_email(reservation.customer, "Reserva confirmada", body)


def send_work_order_ready(work_order):
    body = (
        f"Hola {work_order.customer.name}, tu {work_order.vehicle} ya esta listo "
        f"para retirar. Servicio: {work_order.service.name}."
    )
    return _send_customer_email(work_order.customer, "Tu vehiculo esta listo", body)


def send_new_public_request_notification(public_request):
    """Notifica por email a los usuarios del negocio cuando llega una nueva solicitud pública.

    No lanza excepcion si el envio falla; el error se registra en el logger.
    Devuelve True si se envio al menos un email, False en caso contrario.
    """
    emails = list(
        public_request.business.user_profiles
        .select_related("user")
        .values_list("user__email", flat=True)
    )
    emails = [e for e in emails if e]
    if not emails:
        return False

    request_type_label = (
        "turno" if public_request.request_type == "booking" else "cotizacion"
    )
    service_names = ", ".join(
        item.service.name for item in public_request.items.select_related("service").all()
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
    body += (
        f"\nPodés gestionarla desde tu bandeja en ShineApp:\n"
        f"https://shineapp-web.vercel.app\n\n"
        f"El equipo ShineApp."
    )

    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, emails, fail_silently=False)
        return True
    except Exception:
        logger.exception(
            "No se pudo enviar notificacion de nueva solicitud %s al negocio %s",
            public_request.id,
            public_request.business_id,
        )
        return False


def send_business_push_notification(public_request):
    """Envía una push notification a los usuarios del negocio cuando llega una nueva solicitud pública.

    Itera sobre todos los UserProfile del negocio que tengan push_subscription guardada.
    Devuelve True si se envió al menos una notificación, False en caso contrario.
    """
    private_key = getattr(settings, "VAPID_PRIVATE_KEY", "")
    if not private_key:
        return False

    subscriptions = list(
        public_request.business.user_profiles
        .exclude(push_subscription__isnull=True)
        .values_list("push_subscription", flat=True)
    )
    if not subscriptions:
        return False

    request_type_label = "turno" if public_request.request_type == "booking" else "cotizacion"
    payload = json.dumps({
        "title": f"Nueva solicitud de {request_type_label}",
        "body": f"{public_request.customer_name} pidió un {request_type_label}.",
    })
    vapid_claims = {"sub": getattr(settings, "VAPID_CLAIMS_EMAIL", "mailto:no-reply@shineapp.local")}

    sent_any = False
    for subscription in subscriptions:
        try:
            from pywebpush import webpush  # noqa: PLC0415
            webpush(
                subscription_info=subscription,
                data=payload,
                vapid_private_key=private_key,
                vapid_claims=vapid_claims,
            )
            sent_any = True
        except Exception:
            logger.exception(
                "No se pudo enviar push al negocio %s para solicitud %s",
                public_request.business_id,
                public_request.id,
            )
    return sent_any


def send_public_request_push(public_request):
    """Envía una push notification al cliente cuando el negocio confirma el turno.

    Requiere que `public_request.push_subscription` esté cargado y que las VAPID keys
    estén configuradas via env vars. Devuelve True si el envío fue exitoso, False en
    cualquier otro caso (suscripción ausente, VAPID no configurado, error de red).
    """
    if not public_request.push_subscription:
        return False
    private_key = getattr(settings, "VAPID_PRIVATE_KEY", "")
    if not private_key:
        return False
    try:
        from pywebpush import webpush  # noqa: PLC0415
        webpush(
            subscription_info=public_request.push_subscription,
            data=json.dumps({
                "title": "Turno confirmado",
                "body": f"Hola {public_request.customer_name}, tu turno fue confirmado.",
            }),
            vapid_private_key=private_key,
            vapid_claims={"sub": getattr(settings, "VAPID_CLAIMS_EMAIL", "mailto:no-reply@shineapp.local")},
        )
        return True
    except Exception:
        logger.exception("No se pudo enviar push notification a public_request %s", public_request.id)
        return False


def send_password_reset_email(user_email, reset_token):
    """Envia el link de reset de contrasena al usuario.

    No lanza excepcion si el envio falla; el error se registra en el logger.
    Devuelve True si el envio fue exitoso, False en caso contrario.
    """
    reset_url = f"https://shineapp-web.vercel.app/reset-password?token={reset_token}"
    subject = "ShineApp — Recuperaci\xf3n de contrase\xf1a"
    body = (
        f"Hola,\n\n"
        f"Recibimos una solicitud para restablecer la contrase\xf1a de tu cuenta en ShineApp.\n\n"
        f"Hac\xe9 clic en el siguiente link para crear una nueva contrase\xf1a (v\xe1lido por 1 hora):\n\n"
        f"{reset_url}\n\n"
        f"Si no solicitaste este cambio, ignor\xe1 este email.\n\n"
        f"El equipo ShineApp."
    )
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user_email], fail_silently=False)
        return True
    except Exception:
        logger.exception("No se pudo enviar el email de reset de contrasena a %s", user_email)
        return False
