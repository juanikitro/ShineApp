from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0019_businessprofile_reservation_status_flags"),
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
