from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0028_businessprofile_trial_followup"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="reservation_auto_charge_on_delivery",
            field=models.BooleanField(default=False),
        ),
    ]
