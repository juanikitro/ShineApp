# Generated for Twilio Content API support.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("whatsapp", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="whatsapptemplate",
            name="twilio_content_sid",
            field=models.CharField(blank=True, max_length=64),
        ),
    ]
