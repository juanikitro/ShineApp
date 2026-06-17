from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0012_alter_sector_options_alter_service_options_and_more"),
        ("inventory", "0016_merge_20260617_1059"),
    ]

    operations = [
        migrations.CreateModel(
            name="ServiceMaterialAlternative",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("notes", models.CharField(blank=True, max_length=200)),
                (
                    "alternative_material",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="service_alternatives",
                        to="inventory.material",
                    ),
                ),
                (
                    "service_material",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="alternatives",
                        to="catalog.servicematerial",
                    ),
                ),
            ],
            options={
                "verbose_name": "alternativa de material",
                "verbose_name_plural": "alternativas de material",
            },
        ),
        migrations.AddConstraint(
            model_name="servicematerialalternative",
            constraint=models.UniqueConstraint(
                fields=["service_material", "alternative_material"],
                name="uniq_sma_per_recipe",
            ),
        ),
    ]
