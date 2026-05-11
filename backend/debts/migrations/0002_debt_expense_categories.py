from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("debts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="debt",
            name="expense_category",
            field=models.CharField(default="Servicios", max_length=80),
        ),
        migrations.AddField(
            model_name="debt",
            name="expense_subcategory",
            field=models.CharField(blank=True, default="Otros", max_length=80),
        ),
    ]
