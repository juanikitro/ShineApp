from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0005_finance_business"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(
                fields=["business", "-paid_at"],
                name="pay_biz_paid_at_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="cashmovement",
            index=models.Index(
                fields=["business", "-occurred_at"],
                name="cm_biz_occurred_at_idx",
            ),
        ),
    ]
