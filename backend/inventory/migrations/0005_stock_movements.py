import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("customers", "0005_customer_billing_address_customer_tax_id"),
        ("inventory", "0004_tool_in_use_default"),
        ("scheduling", "0004_reservation_exit_time"),
        ("workorders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="material",
            name="category",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="material",
            name="minimum_stock",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="material",
            name="presentation",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="material",
            name="sku",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddConstraint(
            model_name="material",
            constraint=models.UniqueConstraint(
                condition=models.Q(("sku", ""), _negated=True),
                fields=("sku",),
                name="unique_material_sku_when_present",
            ),
        ),
        migrations.CreateModel(
            name="Supplier",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("contact_name", models.CharField(blank=True, max_length=120)),
                ("phone", models.CharField(blank=True, max_length=60)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("tax_id", models.CharField(blank=True, max_length=32)),
                ("address", models.CharField(blank=True, max_length=220)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="StockMovement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "movement_type",
                    models.CharField(
                        choices=[
                            ("purchase", "Compra"),
                            ("initial_stock", "Stock inicial"),
                            ("consumption", "Consumo"),
                            ("sale", "Venta"),
                        ],
                        max_length=24,
                    ),
                ),
                ("occurred_on", models.DateField(default=django.utils.timezone.localdate)),
                (
                    "document_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("factura_a", "Factura A"),
                            ("factura_b", "Factura B"),
                            ("factura_c", "Factura C"),
                            ("ticket", "Ticket"),
                            ("remito", "Remito"),
                            ("otro", "Otro"),
                        ],
                        max_length=32,
                    ),
                ),
                ("document_number", models.CharField(blank=True, max_length=80)),
                (
                    "document_file",
                    models.FileField(
                        blank=True,
                        upload_to="stock-movements/",
                        validators=[
                            django.core.validators.FileExtensionValidator(
                                allowed_extensions=["png", "jpg", "jpeg", "webp", "svg", "pdf"]
                            )
                        ],
                    ),
                ),
                ("affects_cash", models.BooleanField(default=False)),
                ("products_received", models.BooleanField(default=True)),
                (
                    "payment_method",
                    models.CharField(
                        choices=[
                            ("cash", "Efectivo"),
                            ("card", "Tarjeta"),
                            ("transfer", "Transferencia"),
                            ("other", "Otro"),
                        ],
                        default="cash",
                        max_length=20,
                    ),
                ),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "customer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="stock_movements",
                        to="customers.customer",
                    ),
                ),
                (
                    "reservation",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="stock_movements",
                        to="scheduling.reservation",
                    ),
                ),
                (
                    "supplier",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="stock_movements",
                        to="inventory.supplier",
                    ),
                ),
                (
                    "work_order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="stock_movements",
                        to="workorders.workorder",
                    ),
                ),
            ],
            options={
                "ordering": ["-occurred_on", "-id"],
            },
        ),
        migrations.CreateModel(
            name="StockMovementLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.DecimalField(decimal_places=2, max_digits=12)),
                ("unit_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("line_total", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("estimated_unit_cost", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("estimated_total_cost", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("stock_delta", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "material",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="stock_movement_lines",
                        to="inventory.material",
                    ),
                ),
                (
                    "movement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="inventory.stockmovement",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
            },
        ),
    ]
