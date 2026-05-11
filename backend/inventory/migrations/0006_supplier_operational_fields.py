from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0005_stock_movements"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="category",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="supplier",
            name="legal_name",
            field=models.CharField(blank=True, max_length=180),
        ),
        migrations.AddField(
            model_name="supplier",
            name="tax_condition",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="supplier",
            name="website",
            field=models.URLField(blank=True),
        ),
    ]
