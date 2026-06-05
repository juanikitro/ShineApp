from django.conf import settings
from django.db import migrations, models


def split_existing_capacities(apps, schema_editor):
    DailyCapacity = apps.get_model("scheduling", "DailyCapacity")
    default_value = getattr(settings, "DEFAULT_DAILY_CAPACITY", 8)
    for row in DailyCapacity.objects.all().iterator():
        base_value = row.max_slots if row.max_slots is not None else default_value
        row.max_slots_wash = base_value
        row.max_slots_detailing = base_value
        row.save(update_fields=["max_slots_wash", "max_slots_detailing"])


def merge_split_capacities(apps, schema_editor):
    DailyCapacity = apps.get_model("scheduling", "DailyCapacity")
    for row in DailyCapacity.objects.all().iterator():
        row.max_slots = max(row.max_slots_wash or 0, row.max_slots_detailing or 0)
        row.save(update_fields=["max_slots"])


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0006_dailycapacity_reservation_business"),
    ]

    operations = [
        migrations.AddField(
            model_name="dailycapacity",
            name="max_slots_wash",
            field=models.PositiveIntegerField(default=settings.DEFAULT_DAILY_CAPACITY),
        ),
        migrations.AddField(
            model_name="dailycapacity",
            name="max_slots_detailing",
            field=models.PositiveIntegerField(default=settings.DEFAULT_DAILY_CAPACITY),
        ),
        migrations.RunPython(split_existing_capacities, merge_split_capacities),
        migrations.RemoveField(
            model_name="dailycapacity",
            name="max_slots",
        ),
    ]
