from django.db import migrations, models


def dispatch_for_legacy_rule(config_mode, enabled):
    if config_mode == "paid" and enabled:
        return "automatic"
    return "manual"


def migrate_enabled_to_dispatch(apps, schema_editor):
    WhatsAppAutomationRule = apps.get_model("whatsapp", "WhatsAppAutomationRule")
    WhatsAppConfig = apps.get_model("whatsapp", "WhatsAppConfig")
    for rule in WhatsAppAutomationRule.objects.all().iterator():
        config = WhatsAppConfig.objects.filter(business_id=rule.business_id).first()
        # Sin config el modo es desconocido: NO asumir "paid" (dejaria reglas
        # enabled como automatic). Modo desconocido -> manual.
        mode = config.mode if config is not None else None
        rule.dispatch = dispatch_for_legacy_rule(mode, rule.enabled)
        rule.save(update_fields=["dispatch"])


def restore_enabled_from_dispatch(apps, schema_editor):
    WhatsAppAutomationRule = apps.get_model("whatsapp", "WhatsAppAutomationRule")
    for rule in WhatsAppAutomationRule.objects.all().iterator():
        rule.enabled = rule.dispatch == "automatic"
        rule.save(update_fields=["enabled"])


class Migration(migrations.Migration):

    dependencies = [
        ("whatsapp", "0003_whatsappconfig_mode_and_wame_provider"),
    ]

    operations = [
        migrations.AddField(
            model_name="whatsappautomationrule",
            name="dispatch",
            field=models.CharField(
                choices=[
                    ("manual", "Manual"),
                    ("notify", "Notificar"),
                    ("automatic", "Automatico"),
                ],
                default="manual",
                max_length=12,
            ),
        ),
        migrations.RunPython(migrate_enabled_to_dispatch, restore_enabled_from_dispatch),
        migrations.RemoveField(
            model_name="whatsappautomationrule",
            name="enabled",
        ),
    ]
