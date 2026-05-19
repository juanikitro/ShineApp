from django.db import migrations, models
import django.db.models.deletion


def get_default_business(apps):
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    business, _ = BusinessAccount.objects.get_or_create(slug="default", defaults={"name": "ShineApp"})
    return business


def backfill_debt_business(apps, schema_editor):
    Debt = apps.get_model("debts", "Debt")
    DebtPayment = apps.get_model("debts", "DebtPayment")
    default_business = get_default_business(apps)
    for debt in Debt.objects.filter(business__isnull=True).select_related("supplier", "cash_movement").iterator():
        if debt.supplier_id:
            debt.business = debt.supplier.business
        elif debt.cash_movement_id:
            debt.business = debt.cash_movement.business
        else:
            debt.business = default_business
        debt.save(update_fields=["business"])
    for payment in DebtPayment.objects.filter(business__isnull=True).select_related("debt").iterator():
        payment.business = payment.debt.business if payment.debt_id else default_business
        payment.save(update_fields=["business"])


def business_field(related_name):
    return models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.PROTECT,
        related_name=related_name,
        to="core.businessaccount",
    )


def required_business_field(related_name):
    return models.ForeignKey(
        on_delete=django.db.models.deletion.PROTECT,
        related_name=related_name,
        to="core.businessaccount",
    )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("core", "0010_businessaccount_multitenancy"),
        ("debts", "0003_debt_supplier"),
        ("finance", "0005_finance_business"),
        ("inventory", "0007_inventory_business"),
    ]

    operations = [
        migrations.AddField("debt", "business", business_field("debts")),
        migrations.AddField("debtpayment", "business", business_field("debt_payments")),
        migrations.RunPython(backfill_debt_business, migrations.RunPython.noop),
        migrations.AlterField("debt", "business", required_business_field("debts")),
        migrations.AlterField("debtpayment", "business", required_business_field("debt_payments")),
    ]
