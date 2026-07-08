from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("whatsapp", "0002_whatsapptemplate_twilio_content_sid"),
    ]

    operations = [
        migrations.AddField(
            model_name="whatsappconfig",
            name="mode",
            field=models.CharField(
                choices=[("paid", "Paga (API)"), ("free", "Gratis (wa.me)")],
                default="paid",
                max_length=8,
            ),
        ),
        migrations.AlterField(
            model_name="whatsappconfig",
            name="provider",
            field=models.CharField(
                choices=[
                    ("meta", "Meta Cloud API"),
                    ("twilio", "Twilio"),
                    ("fake", "Fake"),
                    ("wame", "WhatsApp gratis (wa.me)"),
                ],
                default="meta",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="whatsappmessage",
            name="provider",
            field=models.CharField(
                choices=[
                    ("meta", "Meta Cloud API"),
                    ("twilio", "Twilio"),
                    ("fake", "Fake"),
                    ("wame", "WhatsApp gratis (wa.me)"),
                ],
                max_length=16,
            ),
        ),
    ]
