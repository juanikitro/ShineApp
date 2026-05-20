from django.db import migrations, models
import django.db.models.deletion


def backfill_workorder_business(apps, schema_editor):
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    WorkOrder = apps.get_model("workorders", "WorkOrder")
    default_business, _ = BusinessAccount.objects.get_or_create(slug="default", defaults={"name": "ShineApp"})
    for order in WorkOrder.objects.filter(business__isnull=True).select_related("reservation").iterator():
        order.business = order.reservation.business if order.reservation_id else default_business
        order.save(update_fields=["business"])


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("core", "0010_businessaccount_multitenancy"),
        ("scheduling", "0006_dailycapacity_reservation_business"),
        ("workorders", "0002_require_reservation_and_move_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="workorder",
            name="business",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="work_orders",
                to="core.businessaccount",
            ),
        ),
        migrations.RunPython(backfill_workorder_business, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="workorder",
            name="business",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="work_orders",
                to="core.businessaccount",
            ),
        ),
    ]
