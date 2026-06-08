from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0019_businessprofile_reservation_status_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="allow_overlapping_reservations",
            field=models.BooleanField(default=False),
        ),
    ]
