from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0007_daily_capacity_split_by_service_type"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="reservation",
            index=models.Index(
                fields=["business", "day", "status"],
                name="resv_biz_day_status_idx",
            ),
        ),
    ]
