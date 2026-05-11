from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("finance", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="cashclosure",
            name="cashflow_balance",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="cashclosure",
            name="cashflow_expense",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="cashclosure",
            name="cashflow_income",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="cashmovement",
            name="adjusts_closed_day",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="cashmovement",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
