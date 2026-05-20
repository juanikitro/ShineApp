from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_businessprofile_public_landing"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="city",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="country",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="industry",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="trial_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="trial_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
