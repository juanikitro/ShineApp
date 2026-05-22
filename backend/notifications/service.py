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
