from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0021_businessprofile_public_service_display_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="enforce_capacity_limit",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="default_capacity_wash",
            field=models.PositiveIntegerField(default=settings.DEFAULT_DAILY_CAPACITY),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="default_capacity_detailing",
            field=models.PositiveIntegerField(default=settings.DEFAULT_DAILY_CAPACITY),
        ),
    ]
