from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0010_businessaccount_multitenancy"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="allow_public_booking_requests",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="allow_public_quote_requests",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="public_landing_enabled",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="public_landing_intro",
            field=models.CharField(blank=True, max_length=240),
        ),
    ]
