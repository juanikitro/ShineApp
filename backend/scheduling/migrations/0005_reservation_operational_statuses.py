from django.db import migrations, models


def map_completed_to_delivered(apps, schema_editor):
    Reservation = apps.get_model("scheduling", "Reservation")
    Reservation.objects.filter(status="completed").update(status="delivered")


class Migration(migrations.Migration):
    dependencies = [
        ("scheduling", "0004_reservation_exit_time"),
    ]

    operations = [
        migrations.RunPython(map_completed_to_delivered, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="reservation",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pendiente"),
                    ("confirmed", "Confirmada"),
                    ("in_progress", "En proceso"),
                    ("ready", "Listo"),
                    ("delivered", "Entregado"),
                    ("canceled", "Cancelada"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
