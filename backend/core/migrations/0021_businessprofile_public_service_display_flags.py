from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0020_businessprofile_allow_overlapping_reservations"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="public_show_service_description",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="public_show_service_price",
            field=models.BooleanField(default=False),
        ),
    ]
