import core.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_businessprofile_address_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="income_category_tree",
            field=models.JSONField(
                blank=True,
                default=core.models.default_income_category_tree,
            ),
        ),
    ]
