from django.db import migrations


def ensure_role_groups(apps, schema_editor):
    group = apps.get_model("auth", "Group")
    for name in ["empleador", "empleado"]:
        group.objects.get_or_create(name=name)


def remove_role_groups(apps, schema_editor):
    group = apps.get_model("auth", "Group")
    group.objects.filter(name__in=["empleador", "empleado"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(ensure_role_groups, remove_role_groups),
    ]
