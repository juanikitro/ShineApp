from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0013_servicematerialalternative"),
    ]

    operations = [
        migrations.AddField(
            model_name="service",
            name="estimated_material_cost",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True
            ),
        ),
    ]
