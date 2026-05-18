from django.db import migrations, models
from django.db.models import Sum
import django.db.models.deletion
import django.utils.timezone


def order_status_to_reservation_status(order_status, reservation_status=None):
    if order_status in {"in_progress", "ready", "delivered"}:
        return order_status
    if reservation_status == "completed":
        return "delivered"
    if reservation_status in {"pending", "canceled"}:
        return reservation_status
    return "confirmed"


def work_order_status_for_reservation(reservation_status):
    if reservation_status == "delivered":
        return "delivered"
    if reservation_status in {"in_progress", "ready"}:
        return reservation_status
    return "pending"


def reservation_total(apps, reservation):
    ReservationItem = apps.get_model("scheduling", "ReservationItem")
    Service = apps.get_model("catalog", "Service")
    total = ReservationItem.objects.filter(reservation_id=reservation.id).aggregate(total=Sum("line_total"))["total"]
    if total is not None:
        return total
    return Service.objects.get(pk=reservation.service_id).base_price


def sync_pairs(apps, schema_editor):
    Reservation = apps.get_model("scheduling", "Reservation")
    WorkOrder = apps.get_model("workorders", "WorkOrder")

    for reservation in Reservation.objects.all().iterator():
        order = WorkOrder.objects.filter(reservation_id=reservation.id).first()
        if order is None:
            WorkOrder.objects.create(
                reservation_id=reservation.id,
                customer_id=reservation.customer_id,
                vehicle_id=reservation.vehicle_id,
                service_id=reservation.service_id,
                status=work_order_status_for_reservation(reservation.status),
                total_amount=reservation_total(apps, reservation),
            )
            continue

        next_status = order_status_to_reservation_status(order.status, reservation.status)
        if reservation.status != next_status:
            Reservation.objects.filter(pk=reservation.id).update(status=next_status)

        order_updates = []
        for field in ["customer", "vehicle", "service"]:
            field_id = f"{field}_id"
            reservation_value = getattr(reservation, field_id)
            if getattr(order, field_id) != reservation_value:
                setattr(order, field_id, reservation_value)
                order_updates.append(field)

        total = reservation_total(apps, reservation)
        if order.total_amount != total:
            order.total_amount = total
            order_updates.append("total_amount")

        if order_updates:
            order.save(update_fields=order_updates)

    for order in WorkOrder.objects.filter(reservation__isnull=True).iterator():
        source_datetime = order.received_at or order.created_at or django.utils.timezone.now()
        reservation = Reservation.objects.create(
            customer_id=order.customer_id,
            vehicle_id=order.vehicle_id,
            service_id=order.service_id,
            day=source_datetime.date(),
            status=order_status_to_reservation_status(order.status),
        )
        order.reservation = reservation
        order.save(update_fields=["reservation"])


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("scheduling", "0005_reservation_operational_statuses"),
        ("workorders", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(sync_pairs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="workorder",
            name="reservation",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="work_order",
                to="scheduling.reservation",
            ),
        ),
        migrations.RemoveField(
            model_name="workorder",
            name="status",
        ),
    ]
