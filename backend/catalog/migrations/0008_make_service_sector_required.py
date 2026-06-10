import django.db.models.deletion
from django.db import migrations, models


def assert_no_null_sectors(apps, schema_editor):
    Service = apps.get_model("catalog", "Service")
    if Service.objects.filter(sector__isnull=True).exists():
        raise RuntimeError(
            "Migration aborted: hay servicios sin sector asignado. "
            "Ejecutar 0007 correctamente antes de esta migracion."
        )


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0007_sector_service_sector_and_more'),
    ]

    operations = [
        migrations.RunPython(assert_no_null_sectors, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='service',
            name='sector',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='services',
                to='catalog.sector',
            ),
        ),
    ]
