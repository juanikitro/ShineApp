# Generated for multiservice reservations.

from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


def seed_reservation_items(apps, schema_editor):
    Reservation = apps.get_model("scheduling", "Reservation")
    ReservationItem = apps.get_model("scheduling", "ReservationItem")

    items = []
    for reservation in Reservation.objects.select_related("service").all():
        items.append(
            ReservationItem(
                reservation_id=reservation.id,
                service_id=reservation.service_id,
                description=reservation.service.name,
                quantity=Decimal("1.00"),
                unit_price=reservation.service.base_price,
                line_total=reservation.service.base_price,
            )
        )

    if items:
        ReservationItem.objects.bulk_create(items)


def unseed_reservation_items(apps, schema_editor):
    ReservationItem = apps.get_model("scheduling", "ReservationItem")
    ReservationItem.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0001_initial"),
        ("scheduling", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReservationItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("description", models.CharField(max_length=180)),
                ("quantity", models.DecimalField(decimal_places=2, default=Decimal("1.00"), max_digits=10)),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("line_total", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=12)),
                (
                    "reservation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="scheduling.reservation",
                    ),
                ),
                (
                    "service",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="catalog.service",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
            },
        ),
        migrations.RunPython(seed_reservation_items, unseed_reservation_items),
    ]
