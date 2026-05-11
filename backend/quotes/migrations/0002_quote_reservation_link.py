# Generated for linking quotes with optional reservations.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quotes", "0001_initial"),
        ("scheduling", "0002_reservationitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="quote",
            name="reservation",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="quote",
                to="scheduling.reservation",
            ),
        ),
        migrations.AddField(
            model_name="quote",
            name="reservation_day",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="quote",
            name="reservation_start_time",
            field=models.TimeField(blank=True, null=True),
        ),
    ]
