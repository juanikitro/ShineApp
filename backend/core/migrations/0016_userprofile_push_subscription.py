from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0015_businessprofile_opening_closing_time"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="push_subscription",
            field=models.JSONField(blank=True, default=None, null=True),
        ),
    ]
