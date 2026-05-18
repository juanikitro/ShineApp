from django.db import migrations, models
import django.db.models.deletion


def backfill_service_business(apps, schema_editor):
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    Service = apps.get_model("catalog", "Service")
    business, _ = BusinessAccount.objects.get_or_create(slug="default", defaults={"name": "ShineApp"})
    Service.objects.filter(business__isnull=True).update(business=business)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_businessaccount_multitenancy"),
        ("catalog", "0002_service_icon"),
    ]

    operations = [
        migrations.AddField(
            model_name="service",
            name="business",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="services",
                to="core.businessaccount",
            ),
        ),
        migrations.RunPython(backfill_service_business, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="service",
            name="business",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="services",
                to="core.businessaccount",
            ),
        ),
    ]
