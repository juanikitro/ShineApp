from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0012_alter_sector_options_alter_service_options_and_more"),
        ("inventory", "0014_alter_material_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="material",
            name="sector",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="materials",
                to="catalog.sector",
            ),
        ),
    ]
