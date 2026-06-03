from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0016_userprofile_push_subscription"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="public_show_wash_services",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="public_show_detailing_services",
            field=models.BooleanField(default=True),
        ),
    ]
