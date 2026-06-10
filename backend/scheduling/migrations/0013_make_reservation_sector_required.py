import django.db.models.deletion
from django.db import migrations, models


def assert_no_null_sectors(apps, schema_editor):
    Reservation = apps.get_model("scheduling", "Reservation")
    if Reservation.objects.filter(sector__isnull=True).exists():
        raise RuntimeError(
            "Migration aborted: hay reservas sin sector asignado. "
            "Ejecutar 0012 correctamente antes de esta migracion."
        )


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0008_make_service_sector_required'),
        ('scheduling', '0012_reservation_sector'),
    ]

    operations = [
        migrations.RunPython(assert_no_null_sectors, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='reservation',
            name='sector',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='reservations',
                to='catalog.sector',
            ),
        ),
    ]
