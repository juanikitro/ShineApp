from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workorders", "0003_workorder_business"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="workorder",
            index=models.Index(
                fields=["business", "-created_at"],
                name="wo_biz_created_idx",
            ),
        ),
    ]
