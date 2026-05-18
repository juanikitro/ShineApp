from django.db import migrations, models
import django.db.models.deletion


def get_default_business(apps):
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    business, _ = BusinessAccount.objects.get_or_create(slug="default", defaults={"name": "ShineApp"})
    return business


def backfill_customer_business(apps, schema_editor):
    Customer = apps.get_model("customers", "Customer")
    Vehicle = apps.get_model("customers", "Vehicle")
    default_business = get_default_business(apps)
    Customer.objects.filter(business__isnull=True).update(business=default_business)
    for vehicle in Vehicle.objects.filter(business__isnull=True).select_related("customer").iterator():
        vehicle.business = vehicle.customer.business if vehicle.customer_id else default_business
        vehicle.save(update_fields=["business"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_businessaccount_multitenancy"),
        ("customers", "0005_customer_billing_address_customer_tax_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="business",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="customers",
                to="core.businessaccount",
            ),
        ),
        migrations.AddField(
            model_name="vehicle",
            name="business",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="vehicles",
                to="core.businessaccount",
            ),
        ),
        migrations.RunPython(backfill_customer_business, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="vehicle",
            name="unique_vehicle_license_plate_when_present",
        ),
        migrations.AlterField(
            model_name="customer",
            name="business",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="customers",
                to="core.businessaccount",
            ),
        ),
        migrations.AlterField(
            model_name="vehicle",
            name="business",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="vehicles",
                to="core.businessaccount",
            ),
        ),
        migrations.AddConstraint(
            model_name="vehicle",
            constraint=models.UniqueConstraint(
                condition=~models.Q(license_plate=""),
                fields=("business", "license_plate"),
                name="unique_vehicle_license_plate_per_business_when_present",
            ),
        ),
    ]
