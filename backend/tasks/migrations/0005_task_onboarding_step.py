from django.db import migrations, models
from django.db.models import Q
from django.utils import timezone


ONBOARDING_TASKS = {
    "business": ("Negocio listo", "Completa nombre, contacto y el link publico del negocio."),
    "services": ("Servicios vehiculares", "Activa servicios de lavadero, detailing y lubricentro."),
    "turnera": ("Turnera publica", "Activa la landing publica para recibir turnos o consultas."),
    "whatsapp": ("WhatsApp operativo", "Habilita un canal de WhatsApp con numero visible."),
    "agenda": ("Primer turno o trabajo", "Registra el primer turno, trabajo o solicitud publica."),
    "cash-dashboard": ("Primer cobro", "Registra un pago o ingreso real del negocio."),
}


def create_missing_onboarding_tasks(apps, schema_editor):
    Task = apps.get_model("tasks", "Task")
    BusinessProfile = apps.get_model("core", "BusinessProfile")
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    for business in BusinessAccount.objects.all().iterator():
        profile = BusinessProfile.objects.filter(business_id=business.id).first()
        dismissed = set(getattr(profile, "onboarding_dismissed_step_ids", []) or [])
        for step_id, (title, description) in ONBOARDING_TASKS.items():
            task, _created = Task.objects.get_or_create(
                business_id=business.id,
                onboarding_step_id=step_id,
                defaults={
                    "title": title,
                    "description": description,
                    "assignee": None,
                    "due_date": None,
                },
            )
            if step_id in dismissed and task.deleted_at is None:
                task.deleted_at = timezone.now()
                task.save(update_fields=["deleted_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0004_alter_task_options"),
        ("core", "0030_businessprofile_onboarding_dismissed_step_ids"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="onboarding_step_id",
            field=models.CharField(
                blank=True,
                choices=[
                    ("business", "Negocio listo"),
                    ("services", "Servicios vehiculares"),
                    ("turnera", "Turnera publica"),
                    ("whatsapp", "WhatsApp operativo"),
                    ("agenda", "Primer turno o trabajo"),
                    ("cash-dashboard", "Primer cobro"),
                ],
                editable=False,
                max_length=32,
                null=True,
            ),
        ),
        migrations.AddConstraint(
            model_name="task",
            constraint=models.UniqueConstraint(
                condition=Q(onboarding_step_id__isnull=False, deleted_at__isnull=True),
                fields=("business", "onboarding_step_id"),
                name="uniq_active_onboarding_task_step",
            ),
        ),
        migrations.RunPython(create_missing_onboarding_tasks, migrations.RunPython.noop),
    ]
