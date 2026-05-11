from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0002_cash_closure_snapshots_and_audit"),
    ]

    operations = [
        migrations.AddField(
            model_name="cashmovement",
            name="subcategory",
            field=models.CharField(blank=True, max_length=80),
        ),
    ]
