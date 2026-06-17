from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0013_servicematerialalternative"),
        ("inventory", "0016_merge_20260617_1059"),
        ("scheduling", "0014_alter_reservation_options_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReservationMaterialOverride",
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
                (
                    "chosen_material",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="reservation_overrides",
                        to="inventory.material",
                    ),
                ),
                (
                    "reservation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="material_overrides",
                        to="scheduling.reservation",
                    ),
                ),
                (
                    "service_material",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reservation_overrides",
                        to="catalog.servicematerial",
                    ),
                ),
            ],
            options={
                "verbose_name": "reemplazo de material en reserva",
                "verbose_name_plural": "reemplazos de material en reserva",
            },
        ),
        migrations.AddConstraint(
            model_name="reservationmaterialoverride",
            constraint=models.UniqueConstraint(
                fields=["reservation", "service_material"],
                name="uniq_rmo_per_reservation_slot",
            ),
        ),
    ]
