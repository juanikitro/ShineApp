# Generated for WhatsApp MVP.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0027_businesshours"),
        ("customers", "0011_alter_customer_options_alter_vehicle_options"),
        ("quotes", "0007_alter_quote_options_alter_quoteitem_options"),
        ("scheduling", "0015_reservationmaterialoverride"),
        ("workorders", "0008_alter_workorder_options"),
    ]

    operations = [
        migrations.CreateModel(
            name="WhatsAppConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(choices=[("meta", "Meta Cloud API"), ("twilio", "Twilio"), ("fake", "Fake")], default="meta", max_length=16)),
                ("is_enabled", models.BooleanField(default=False)),
                ("phone_number_display", models.CharField(blank=True, max_length=60)),
                ("phone_number_id", models.CharField(blank=True, max_length=120)),
                ("business_account_id", models.CharField(blank=True, max_length=120)),
                ("access_token", models.TextField(blank=True)),
                ("default_country_code", models.CharField(default="+54", max_length=8)),
                ("last_verified_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("business", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="whatsapp_config", to="core.businessaccount")),
            ],
            options={
                "verbose_name": "configuración de WhatsApp",
                "verbose_name_plural": "configuraciones de WhatsApp",
                "ordering": ["business_id"],
            },
        ),
        migrations.CreateModel(
            name="WhatsAppTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.CharField(choices=[("reservation_confirmed", "Turno confirmado"), ("work_ready", "Trabajo listo"), ("work_delivered", "Trabajo entregado"), ("quote_sent", "Cotización enviada"), ("manual", "Manual")], max_length=32)),
                ("provider_template_name", models.CharField(max_length=120)),
                ("language", models.CharField(default="es_AR", max_length=16)),
                ("category", models.CharField(choices=[("utility", "Utility"), ("marketing", "Marketing"), ("authentication", "Authentication"), ("service", "Service")], default="utility", max_length=20)),
                ("body_preview", models.TextField(blank=True)),
                ("variables_schema", models.JSONField(blank=True, default=list)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("business", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="whatsapp_templates", to="core.businessaccount")),
            ],
            options={"ordering": ["key", "id"]},
        ),
        migrations.CreateModel(
            name="WhatsAppAutomationRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event", models.CharField(choices=[("reservation_confirmed", "Turno confirmado"), ("work_ready", "Trabajo listo"), ("work_delivered", "Trabajo entregado"), ("quote_sent", "Cotización enviada")], max_length=32)),
                ("enabled", models.BooleanField(default=False)),
                ("send_delay_minutes", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("business", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="whatsapp_automation_rules", to="core.businessaccount")),
                ("template", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="automation_rules", to="whatsapp.whatsapptemplate")),
            ],
            options={"ordering": ["event"]},
        ),
        migrations.CreateModel(
            name="WhatsAppMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("recipient_phone", models.CharField(max_length=32)),
                ("recipient_name", models.CharField(blank=True, max_length=160)),
                ("message_type", models.CharField(choices=[("template", "Template"), ("free_text", "Texto libre")], default="template", max_length=16)),
                ("event", models.CharField(choices=[("reservation_confirmed", "Turno confirmado"), ("work_ready", "Trabajo listo"), ("work_delivered", "Trabajo entregado"), ("quote_sent", "Cotización enviada"), ("manual", "Manual")], max_length=32)),
                ("template_variables", models.JSONField(blank=True, default=dict)),
                ("rendered_body", models.TextField(blank=True)),
                ("provider", models.CharField(choices=[("meta", "Meta Cloud API"), ("twilio", "Twilio"), ("fake", "Fake")], max_length=16)),
                ("provider_message_id", models.CharField(blank=True, max_length=160)),
                ("provider_response", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(choices=[("pending", "Pendiente"), ("sending", "Enviando"), ("sent", "Enviado"), ("delivered", "Entregado"), ("read", "Leído"), ("failed", "Fallido"), ("dead", "Descartado")], default="pending", max_length=16)),
                ("last_error", models.TextField(blank=True)),
                ("attempts", models.PositiveIntegerField(default=0)),
                ("max_attempts", models.PositiveIntegerField(default=5)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("business", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="whatsapp_messages", to="core.businessaccount")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_whatsapp_messages", to=settings.AUTH_USER_MODEL)),
                ("customer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="whatsapp_messages", to="customers.customer")),
                ("quote", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="whatsapp_messages", to="quotes.quote")),
                ("reservation", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="whatsapp_messages", to="scheduling.reservation")),
                ("template", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="messages", to="whatsapp.whatsapptemplate")),
                ("vehicle", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="whatsapp_messages", to="customers.vehicle")),
                ("work_order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="whatsapp_messages", to="workorders.workorder")),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.AddConstraint(
            model_name="whatsapptemplate",
            constraint=models.UniqueConstraint(fields=("business", "key", "provider_template_name", "language"), name="uniq_wa_template_per_business_key_name_lang"),
        ),
        migrations.AddConstraint(
            model_name="whatsappautomationrule",
            constraint=models.UniqueConstraint(fields=("business", "event"), name="uniq_wa_rule_per_business_event"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["business", "status", "-created_at"], name="wa_msg_biz_status_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["business", "event", "-created_at"], name="wa_msg_biz_event_idx"),
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["status", "created_at"], name="wa_msg_status_created_idx"),
        ),
    ]
