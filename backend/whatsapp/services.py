import re

from django.db import transaction

from .models import (
    WhatsAppAutomationRule,
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplate,
)
from .providers import WhatsAppProviderError, provider_for_config


def normalize_phone(raw_phone, *, default_country_code="+54"):
    digits = re.sub(r"\D+", "", raw_phone or "")
    if not digits:
        return ""
    country_digits = re.sub(r"\D+", "", default_country_code or "+54") or "54"
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith(country_digits):
        return digits
    if digits.startswith("0"):
        digits = digits[1:]
    return f"{country_digits}{digits}"


def render_template_body(template, variables):
    body = template.body_preview or ""
    for key, value in (variables or {}).items():
        body = body.replace("{" + key + "}", str(value))
    return body


def _service_names(source):
    items = getattr(source, "service_items", None)
    if items is not None:
        names = [item.description or item.service.name for item in items if item.service_id]
        if names:
            return ", ".join(names)
    return getattr(getattr(source, "service", None), "name", "")


def reservation_variables(reservation):
    return {
        "cliente": reservation.customer.name,
        "fecha_turno": reservation.day.strftime("%d/%m/%Y"),
        "hora_turno": reservation.start_time.strftime("%H:%M") if reservation.start_time else "",
        "vehiculo": str(reservation.vehicle),
        "servicios": _service_names(reservation),
    }


def work_order_variables(work_order):
    return {
        "cliente": work_order.customer.name,
        "vehiculo": str(work_order.vehicle),
        "servicios": _service_names(work_order.reservation),
        "estado": work_order.status,
    }


def quote_variables(quote):
    return {
        "cliente": quote.customer_snapshot_name or quote.customer.name,
        "vehiculo": quote.vehicle_snapshot_label or (str(quote.vehicle) if quote.vehicle else ""),
        "codigo": quote.public_code or quote.id,
        "total": str(quote.total),
        "validez": quote.valid_until.strftime("%d/%m/%Y") if quote.valid_until else "",
    }


def _recipient_from_customer(customer, config):
    return normalize_phone(customer.phone, default_country_code=config.default_country_code)


def create_message(
    *,
    business,
    event,
    recipient_phone,
    recipient_name="",
    template=None,
    variables=None,
    rendered_body="",
    message_type=WhatsAppMessage.MessageType.TEMPLATE,
    customer=None,
    vehicle=None,
    reservation=None,
    work_order=None,
    quote=None,
    created_by=None,
):
    config = WhatsAppConfig.get_solo(business)
    recipient = normalize_phone(recipient_phone, default_country_code=config.default_country_code)
    if not recipient:
        return None
    variables = variables or {}
    if template and not rendered_body:
        rendered_body = render_template_body(template, variables)
    return WhatsAppMessage.objects.create(
        business=business,
        recipient_phone=recipient,
        recipient_name=recipient_name,
        customer=customer,
        vehicle=vehicle,
        reservation=reservation,
        work_order=work_order,
        quote=quote,
        event=event,
        message_type=message_type,
        template=template,
        template_variables=variables,
        rendered_body=rendered_body,
        provider=config.provider,
        created_by=created_by,
    )


def send_message(message):
    if message is None:
        return None
    if message.status not in [WhatsAppMessage.Status.PENDING, WhatsAppMessage.Status.FAILED]:
        return message
    config = WhatsAppConfig.get_solo(message.business)
    if not config.is_enabled:
        message.status = WhatsAppMessage.Status.FAILED
        message.last_error = "WhatsApp no está habilitado para este negocio."
        message.attempts += 1
        message.save(update_fields=["status", "last_error", "attempts", "updated_at"])
        return message
    message.status = WhatsAppMessage.Status.SENDING
    message.save(update_fields=["status", "updated_at"])
    provider = provider_for_config(config)
    try:
        if message.message_type == WhatsAppMessage.MessageType.FREE_TEXT:
            result = provider.send_text(message)
        else:
            result = provider.send_template(message)
    except Exception as exc:  # noqa: BLE001
        message.attempts += 1
        message.last_error = str(exc)[:2000]
        message.status = (
            WhatsAppMessage.Status.DEAD
            if message.attempts >= message.max_attempts
            else WhatsAppMessage.Status.FAILED
        )
        message.save(update_fields=["attempts", "last_error", "status", "updated_at"])
        return message
    message.attempts += 1
    message.save(update_fields=["attempts", "updated_at"])
    message.mark_sent(
        provider_message_id=result.get("id", ""),
        provider_response=result.get("response", {}),
    )
    return message


def flush_whatsapp_outbox(limit=100):
    pending = list(
        WhatsAppMessage.objects.filter(
            status__in=[WhatsAppMessage.Status.PENDING, WhatsAppMessage.Status.FAILED]
        ).order_by("created_at", "id")[:limit]
    )
    sent = failed = 0
    for message in pending:
        send_message(message)
        message.refresh_from_db()
        if message.status == WhatsAppMessage.Status.SENT:
            sent += 1
        elif message.status in [WhatsAppMessage.Status.FAILED, WhatsAppMessage.Status.DEAD]:
            failed += 1
    return {"processed": len(pending), "sent": sent, "failed": failed}


def automation_rule_for(business, event):
    return (
        WhatsAppAutomationRule.objects.select_related("template")
        .filter(business=business, event=event, enabled=True)
        .first()
    )


def enqueue_automated_message(*, event, source):
    business = source.business
    config = WhatsAppConfig.get_solo(business)
    if not config.is_enabled:
        return None
    rule = automation_rule_for(business, event)
    if not rule or not rule.template or not rule.template.is_active:
        return None
    if event == WhatsAppMessage.Event.RESERVATION_CONFIRMED:
        variables = reservation_variables(source)
        customer = source.customer
        vehicle = source.vehicle
        recipient_phone = _recipient_from_customer(customer, config)
        message = create_message(
            business=business,
            event=event,
            recipient_phone=recipient_phone,
            recipient_name=customer.name,
            template=rule.template,
            variables=variables,
            customer=customer,
            vehicle=vehicle,
            reservation=source,
        )
    elif event in [WhatsAppMessage.Event.WORK_READY, WhatsAppMessage.Event.WORK_DELIVERED]:
        variables = work_order_variables(source)
        customer = source.customer
        vehicle = source.vehicle
        recipient_phone = _recipient_from_customer(customer, config)
        message = create_message(
            business=business,
            event=event,
            recipient_phone=recipient_phone,
            recipient_name=customer.name,
            template=rule.template,
            variables=variables,
            customer=customer,
            vehicle=vehicle,
            reservation=source.reservation,
            work_order=source,
        )
    else:
        return None
    transaction.on_commit(lambda: send_message(message))
    return message


def send_quote_whatsapp(quote, *, user=None):
    config = WhatsAppConfig.get_solo(quote.business)
    if not config.is_enabled:
        raise WhatsAppProviderError("WhatsApp no está habilitado para este negocio.")
    template = (
        WhatsAppTemplate.objects.filter(
            business=quote.business,
            key=WhatsAppTemplate.Key.QUOTE_SENT,
            is_active=True,
        )
        .order_by("id")
        .first()
    )
    if template is None:
        raise WhatsAppProviderError("No hay template activo para enviar cotizaciones por WhatsApp.")
    recipient_phone = normalize_phone(
        quote.customer_snapshot_phone or quote.customer.phone,
        default_country_code=config.default_country_code,
    )
    if not recipient_phone:
        raise WhatsAppProviderError("El cliente no tiene teléfono para WhatsApp.")
    message = create_message(
        business=quote.business,
        event=WhatsAppMessage.Event.QUOTE_SENT,
        recipient_phone=recipient_phone,
        recipient_name=quote.customer_snapshot_name or quote.customer.name,
        template=template,
        variables=quote_variables(quote),
        customer=quote.customer,
        vehicle=quote.vehicle,
        reservation=quote.reservation,
        quote=quote,
        created_by=user,
    )
    send_message(message)
    message.refresh_from_db()
    if message.status == WhatsAppMessage.Status.SENT:
        quote.mark_sent()
    return message

