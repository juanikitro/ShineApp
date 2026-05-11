from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("customers", "0003_customer_birthday"),
    ]

    operations = [
        migrations.AlterField(
            model_name="vehicle",
            name="license_plate",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddConstraint(
            model_name="vehicle",
            constraint=models.UniqueConstraint(
                condition=~models.Q(license_plate=""),
                fields=("license_plate",),
                name="unique_vehicle_license_plate_when_present",
            ),
        ),
    ]
