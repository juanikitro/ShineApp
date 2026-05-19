from django.db import migrations, models
import django.db.models.deletion


def get_default_business(apps):
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    business, _ = BusinessAccount.objects.get_or_create(slug="default", defaults={"name": "ShineApp"})
    return business


def backfill_scheduling_business(apps, schema_editor):
    DailyCapacity = apps.get_model("scheduling", "DailyCapacity")
    Reservation = apps.get_model("scheduling", "Reservation")
    default_business = get_default_business(apps)
    DailyCapacity.objects.filter(business__isnull=True).update(business=default_business)
    for reservation in Reservation.objects.filter(business__isnull=True).select_related("customer").iterator():
        reservation.business = reservation.customer.business if reservation.customer_id else default_business
        reservation.save(update_fields=["business"])


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("catalog", "0003_service_business"),
        ("core", "0010_businessaccount_multitenancy"),
        ("customers", "0006_customer_vehicle_business"),
        ("scheduling", "0005_reservation_operational_statuses"),
    ]

    operations = [
        migrations.AddField(
            model_name="dailycapacity",
            name="business",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="daily_capacities",
                to="core.businessaccount",
            ),
        ),
        migrations.AddField(
            model_name="reservation",
            name="business",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="reservations",
                to="core.businessaccount",
            ),
        ),
        migrations.RunPython(backfill_scheduling_business, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="dailycapacity",
            name="day",
            field=models.DateField(),
        ),
        migrations.AlterField(
            model_name="dailycapacity",
            name="business",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="daily_capacities",
                to="core.businessaccount",
            ),
        ),
        migrations.AlterField(
            model_name="reservation",
            name="business",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="reservations",
                to="core.businessaccount",
            ),
        ),
        migrations.AddConstraint(
            model_name="dailycapacity",
            constraint=models.UniqueConstraint(fields=("business", "day"), name="unique_daily_capacity_per_business_day"),
        ),
    ]
