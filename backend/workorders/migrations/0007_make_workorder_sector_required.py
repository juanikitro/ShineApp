import django.db.models.deletion
from django.db import migrations, models


def assert_no_null_sectors(apps, schema_editor):
    WorkOrder = apps.get_model("workorders", "WorkOrder")
    if WorkOrder.objects.filter(sector__isnull=True).exists():
        raise RuntimeError(
            "Migration aborted: hay ordenes de trabajo sin sector asignado. "
            "Ejecutar 0006 correctamente antes de esta migracion."
        )


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0008_make_service_sector_required'),
        ('scheduling', '0013_make_reservation_sector_required'),
        ('workorders', '0006_workorder_sector'),
    ]

    operations = [
        migrations.RunPython(assert_no_null_sectors, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='workorder',
            name='sector',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='work_orders',
                to='catalog.sector',
            ),
        ),
    ]
