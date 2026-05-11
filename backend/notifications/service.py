from django.conf import settings
from django.core.mail import send_mail


def _send_customer_email(customer, subject, body):
    if not customer.email:
        return False
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [customer.email], fail_silently=True)
    return True


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
