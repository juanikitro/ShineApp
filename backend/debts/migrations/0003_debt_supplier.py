import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0006_supplier_operational_fields"),
        ("debts", "0002_debt_expense_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="debt",
            name="supplier",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="debts",
                to="inventory.supplier",
            ),
        ),
    ]
