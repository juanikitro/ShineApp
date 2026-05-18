from django.db import migrations, models
import django.db.models.deletion


def get_default_business(apps):
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    business, _ = BusinessAccount.objects.get_or_create(slug="default", defaults={"name": "ShineApp"})
    return business


def backfill_inventory_business(apps, schema_editor):
    Material = apps.get_model("inventory", "Material")
    Supplier = apps.get_model("inventory", "Supplier")
    MaterialOpenUnit = apps.get_model("inventory", "MaterialOpenUnit")
    Tool = apps.get_model("inventory", "Tool")
    MaterialPurchase = apps.get_model("inventory", "MaterialPurchase")
    MaterialConsumption = apps.get_model("inventory", "MaterialConsumption")
    StockMovement = apps.get_model("inventory", "StockMovement")
    default_business = get_default_business(apps)

    Material.objects.filter(business__isnull=True).update(business=default_business)
    Supplier.objects.filter(business__isnull=True).update(business=default_business)
    Tool.objects.filter(business__isnull=True).update(business=default_business)

    for unit in MaterialOpenUnit.objects.filter(business__isnull=True).select_related("material").iterator():
        unit.business = unit.material.business if unit.material_id else default_business
        unit.save(update_fields=["business"])
    for purchase in MaterialPurchase.objects.filter(business__isnull=True).select_related("material").iterator():
        purchase.business = purchase.material.business if purchase.material_id else default_business
        purchase.save(update_fields=["business"])
    for consumption in (
        MaterialConsumption.objects.filter(business__isnull=True)
        .select_related("work_order", "material")
        .iterator()
    ):
        if consumption.work_order_id:
            consumption.business = consumption.work_order.business
        elif consumption.material_id:
            consumption.business = consumption.material.business
        else:
            consumption.business = default_business
        consumption.save(update_fields=["business"])
    for movement in (
        StockMovement.objects.filter(business__isnull=True)
        .select_related("supplier", "customer", "reservation", "work_order")
        .iterator()
    ):
        for related in [movement.supplier, movement.customer, movement.reservation, movement.work_order]:
            if related is not None and related.business_id:
                movement.business = related.business
                break
        if not movement.business_id:
            movement.business = default_business
        movement.save(update_fields=["business"])


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

    dependencies = [
        ("core", "0010_businessaccount_multitenancy"),
        ("customers", "0006_customer_vehicle_business"),
        ("inventory", "0006_supplier_operational_fields"),
        ("scheduling", "0006_dailycapacity_reservation_business"),
        ("workorders", "0003_workorder_business"),
    ]

    operations = [
        migrations.AddField("material", "business", business_field("materials")),
        migrations.AddField("supplier", "business", business_field("suppliers")),
        migrations.AddField("materialopenunit", "business", business_field("material_open_units")),
        migrations.AddField("tool", "business", business_field("tools")),
        migrations.AddField("materialpurchase", "business", business_field("material_purchases")),
        migrations.AddField("materialconsumption", "business", business_field("material_consumptions")),
        migrations.AddField("stockmovement", "business", business_field("stock_movements")),
        migrations.RunPython(backfill_inventory_business, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="material",
            name="unique_material_sku_when_present",
        ),
        migrations.AlterField("material", "business", required_business_field("materials")),
        migrations.AlterField("supplier", "business", required_business_field("suppliers")),
        migrations.AlterField("materialopenunit", "business", required_business_field("material_open_units")),
        migrations.AlterField("tool", "business", required_business_field("tools")),
        migrations.AlterField("materialpurchase", "business", required_business_field("material_purchases")),
        migrations.AlterField("materialconsumption", "business", required_business_field("material_consumptions")),
        migrations.AlterField("stockmovement", "business", required_business_field("stock_movements")),
        migrations.AddConstraint(
            model_name="material",
            constraint=models.UniqueConstraint(
                condition=~models.Q(sku=""),
                fields=("business", "sku"),
                name="unique_material_sku_per_business_when_present",
            ),
        ),
    ]
