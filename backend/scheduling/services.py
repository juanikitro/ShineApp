from workorders.models import WorkOrder

from .models import Reservation


def reservation_requires_work_order(reservation):
    return bool(reservation and reservation.pk)


def ensure_reservation_work_order(reservation):
    if not reservation_requires_work_order(reservation):
        return None

    order, created = WorkOrder.objects.get_or_create(
        reservation=reservation,
        defaults={
            "customer": reservation.customer,
            "vehicle": reservation.vehicle,
            "service": reservation.service,
            "total_amount": reservation.services_total,
        },
    )
    if created:
        return order

    update_fields = []
    for field in ["customer", "vehicle", "service"]:
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
