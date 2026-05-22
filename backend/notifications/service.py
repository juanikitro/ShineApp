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
