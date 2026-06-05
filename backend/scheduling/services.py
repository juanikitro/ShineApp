from django.utils import timezone

from workorders.models import WorkOrder

from .models import Reservation


def reservation_requires_work_order(reservation):
    return bool(reservation and reservation.pk)


def realign_reservations_to_profile(business, profile, previous_flags):
    summary = {}
    for status_value in Reservation.FLOW_ORDER:
        was_enabled = _status_was_enabled(status_value, previous_flags)
        is_enabled = Reservation.status_is_enabled(status_value, profile)
        if was_enabled and not is_enabled:
            target = Reservation.normalize_status_for_profile(status_value, profile)
            if target and target != status_value:
                moved = Reservation.objects.filter(business=business, status=status_value).update(
                    status=target,
                    updated_at=timezone.now(),
                )
                if moved:
                    summary[status_value] = {"action": "migrated", "target": target, "count": moved}

    if previous_flags.get("reservation_use_canceled", True) and not profile.reservation_use_canceled:
        removed, _ = Reservation.objects.filter(
            business=business,
            status=Reservation.Status.CANCELED,
        ).delete()
        if removed:
            summary[Reservation.Status.CANCELED] = {"action": "deleted", "count": removed}
    return summary


def _status_was_enabled(status_value, previous_flags):
    if status_value in Reservation.REQUIRED_STATUSES:
        return True
    if status_value == Reservation.Status.CANCELED:
        return bool(previous_flags.get("reservation_use_canceled", True))
    flag = Reservation.OPTIONAL_FLAG_BY_STATUS.get(status_value)
    if not flag:
        return True
    return bool(previous_flags.get(flag, True))


def ensure_reservation_work_order(reservation):
    if not reservation_requires_work_order(reservation):
        return None

    order, created = WorkOrder.objects.get_or_create(
        reservation=reservation,
        defaults={
            "business": reservation.business,
            "customer": reservation.customer,
            "vehicle": reservation.vehicle,
            "service": reservation.service,
            "total_amount": reservation.services_total,
        },
    )
    if created:
        return order

    update_fields = []
    for field in ["business", "customer", "vehicle", "service"]:
        field_id = f"{field}_id"
        reservation_value = getattr(reservation, field_id)
        if getattr(order, field_id) != reservation_value:
            setattr(order, field, getattr(reservation, field))
            update_fields.append(field)

    if order.total_amount != reservation.services_total:
        order.total_amount = reservation.services_total
        update_fields.append("total_amount")

    if update_fields:
        order.save(update_fields=[*update_fields, "updated_at"])
    return order
