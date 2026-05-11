import django.core.validators
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_businessprofile_expense_category_tree'),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="address",
            field=models.CharField(blank=True, max_length=220),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="default_quote_validity_days",
            field=models.PositiveSmallIntegerField(default=7),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="default_quote_tax_rate",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=5,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100),
                ],
            ),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="default_quote_discount_rate",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=5,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100),
                ],
            ),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="default_quote_terms",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="businessprofile",
            name="default_quote_payment_instructions",
            field=models.TextField(blank=True),
        ),
    ]
