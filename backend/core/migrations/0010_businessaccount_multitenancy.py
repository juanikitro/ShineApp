from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def default_business_account(BusinessAccount):
    business, _ = BusinessAccount.objects.get_or_create(
        slug="default",
        defaults={"name": "ShineApp"},
    )
    return business


def backfill_core_business(apps, schema_editor):
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    BusinessProfile = apps.get_model("core", "BusinessProfile")
    UserProfile = apps.get_model("core", "UserProfile")
    AuditLog = apps.get_model("core", "AuditLog")
    user_app, user_model = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(user_app, user_model)

    default_business = default_business_account(BusinessAccount)
    profiles = list(BusinessProfile.objects.order_by("id"))
    if not profiles:
        BusinessProfile.objects.create(business=default_business, name=default_business.name)
    for index, profile in enumerate(profiles):
        if profile.business_id:
            continue
        if index == 0:
            business = default_business
            if profile.name and business.name != profile.name:
                business.name = profile.name
                business.save(update_fields=["name", "updated_at"])
        else:
            business, _ = BusinessAccount.objects.get_or_create(
                slug=f"profile-{profile.id}",
                defaults={"name": profile.name or f"Negocio {profile.id}"},
            )
        profile.business = business
        profile.save(update_fields=["business"])

    for profile in UserProfile.objects.filter(business__isnull=True).iterator():
        profile.business = default_business
        profile.save(update_fields=["business"])

    for user in User.objects.filter(profile__isnull=True, is_staff=False, is_superuser=False).iterator():
        UserProfile.objects.create(user=user, business=default_business)

    for log in AuditLog.objects.filter(business__isnull=True).select_related("actor").iterator():
        business = default_business
        if log.actor_id:
            profile = UserProfile.objects.filter(user_id=log.actor_id).first()
            if profile and profile.business_id:
                business = profile.business
        log.business = business
        log.save(update_fields=["business"])


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("core", "0009_auditlog"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BusinessAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("slug", models.SlugField(max_length=80, unique=True)),
                ("is_active", models.BooleanField(default=True)),
                ("deactivated_at", models.DateTimeField(blank=True, null=True)),
                ("deactivation_reason", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "negocio",
                "verbose_name_plural": "negocios",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="business",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="profile",
                to="core.businessaccount",
            ),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="business",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="user_profiles",
                to="core.businessaccount",
            ),
        ),
        migrations.AddField(
            model_name="auditlog",
            name="business",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="audit_logs",
                to="core.businessaccount",
            ),
        ),
        migrations.RunPython(backfill_core_business, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="businessprofile",
            name="business",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="profile",
                to="core.businessaccount",
            ),
        ),
        migrations.AlterField(
            model_name="userprofile",
            name="business",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="user_profiles",
                to="core.businessaccount",
            ),
        ),
    ]
