from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0008_businessprofile_income_category_tree"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("actor_username", models.CharField(blank=True, max_length=150)),
                ("actor_email", models.EmailField(blank=True, max_length=254)),
                ("actor_role", models.CharField(blank=True, max_length=32)),
                ("action", models.CharField(max_length=40)),
                ("module", models.CharField(max_length=80)),
                ("entity_type", models.CharField(max_length=120)),
                ("entity_id", models.CharField(blank=True, max_length=80)),
                ("entity_label", models.CharField(blank=True, max_length=240)),
                ("before", models.JSONField(blank=True, null=True)),
                ("after", models.JSONField(blank=True, null=True)),
                ("changes", models.JSONField(blank=True, default=dict)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("request_path", models.CharField(blank=True, max_length=500)),
                ("request_method", models.CharField(blank=True, max_length=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at", "-id"],
                "indexes": [
                    models.Index(fields=["-created_at"], name="core_auditl_created_49a799_idx"),
                    models.Index(fields=["actor", "-created_at"], name="core_auditl_actor_i_010a7d_idx"),
                    models.Index(fields=["module", "-created_at"], name="core_auditl_module_709697_idx"),
                    models.Index(fields=["action", "-created_at"], name="core_auditl_action_bcd443_idx"),
                ],
            },
        ),
    ]
