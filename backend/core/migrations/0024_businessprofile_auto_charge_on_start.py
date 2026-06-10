from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0023_businessprofile_capacity_defaults"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="auto_charge_on_start",
            field=models.BooleanField(default=False),
        ),
    ]
