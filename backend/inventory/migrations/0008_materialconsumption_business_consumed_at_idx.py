from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0007_inventory_business"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="materialconsumption",
            index=models.Index(
                fields=["business", "-consumed_at"],
                name="mc_biz_consumed_at_idx",
            ),
        ),
    ]
