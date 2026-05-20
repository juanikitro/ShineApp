from django.db import migrations, models
import django.db.models.deletion


def get_default_business(apps):
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    business, _ = BusinessAccount.objects.get_or_create(slug="default", defaults={"name": "ShineApp"})
    return business


def backfill_finance_business(apps, schema_editor):
    Payment = apps.get_model("finance", "Payment")
    CashMovement = apps.get_model("finance", "CashMovement")
    CashClosure = apps.get_model("finance", "CashClosure")
    UserProfile = apps.get_model("core", "UserProfile")
    default_business = get_default_business(apps)

    for payment in Payment.objects.filter(business__isnull=True).select_related("work_order").iterator():
        payment.business = payment.work_order.business if payment.work_order_id else default_business
        payment.save(update_fields=["business"])

    for movement in (
        CashMovement.objects.filter(business__isnull=True)
        .select_related("payment", "material_purchase", "stock_movement", "created_by")
        .iterator()
    ):
        if movement.payment_id:
            movement.business = movement.payment.business
        elif movement.material_purchase_id:
            movement.business = movement.material_purchase.business
        elif movement.stock_movement_id:
            movement.business = movement.stock_movement.business
        elif movement.created_by_id:
            profile = UserProfile.objects.filter(user_id=movement.created_by_id).first()
            movement.business = profile.business if profile else default_business
        else:
            movement.business = default_business
        movement.save(update_fields=["business"])

    CashClosure.objects.filter(business__isnull=True).update(business=default_business)


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
        ("finance", "0004_cashmovement_stock_movement"),
        ("inventory", "0007_inventory_business"),
        ("workorders", "0003_workorder_business"),
    ]

    operations = [
        migrations.AddField("payment", "business", business_field("payments")),
        migrations.AddField("cashmovement", "business", business_field("cash_movements")),
        migrations.AddField("cashclosure", "business", business_field("cash_closures")),
        migrations.RunPython(backfill_finance_business, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="cashclosure",
            name="day",
            field=models.DateField(),
        ),
        migrations.AlterField("payment", "business", required_business_field("payments")),
        migrations.AlterField("cashmovement", "business", required_business_field("cash_movements")),
        migrations.AlterField("cashclosure", "business", required_business_field("cash_closures")),
        migrations.AddConstraint(
            model_name="cashclosure",
            constraint=models.UniqueConstraint(fields=("business", "day"), name="unique_cash_closure_per_business_day"),
        ),
    ]
