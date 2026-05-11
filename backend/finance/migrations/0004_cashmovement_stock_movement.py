import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0003_cashmovement_subcategory"),
        ("inventory", "0005_stock_movements"),
    ]

    operations = [
        migrations.AddField(
            model_name="cashmovement",
            name="stock_movement",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="cash_movement",
                to="inventory.stockmovement",
            ),
        ),
    ]
