from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_businessprofile_public_service_type_filters"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="public_hidden_service_ids",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
