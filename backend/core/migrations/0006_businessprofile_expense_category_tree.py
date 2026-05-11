import core.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_allow_pdf_for_profile_assets"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="expense_category_tree",
            field=models.JSONField(
                blank=True,
                default=core.models.default_expense_category_tree,
            ),
        ),
    ]
