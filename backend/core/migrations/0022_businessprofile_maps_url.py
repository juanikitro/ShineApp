from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0021_businessprofile_public_service_display_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="maps_url",
            field=models.URLField(blank=True, max_length=500),
        ),
    ]
