from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0029_businessprofile_reservation_auto_charge_on_delivery"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="onboarding_dismissed_step_ids",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
