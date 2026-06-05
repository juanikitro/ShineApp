from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_businessprofile_public_service_type_filters"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="reservation_use_pending",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="reservation_use_in_progress",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="reservation_use_ready",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="reservation_use_canceled",
            field=models.BooleanField(default=True),
        ),
    ]
