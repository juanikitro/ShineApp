from decimal import Decimal

from django.db import models
from django.db.models import Sum
from django.utils import timezone

from core.models import PROFILE_ASSET_FILE_VALIDATOR
from core.soft_delete import SoftDeleteMixin


class Material(SoftDeleteMixin):
    business = models.ForeignKey("core.BusinessAccount", related_name="materials", on_delete=models.PROTECT)
    name = models.CharField(max_length=140)
    unit = models.CharField(max_length=30)
    category = models.CharField(max_length=80, blank=True)
    sku = models.CharField(max_length=80, blank=True)
    presentation = models.CharField(max_length=120, blank=True)
    stock_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    minimum_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["name"]
        verbose_name = "material"
        verbose_name_plural = "materiales"
        indexes = [
            models.Index(fields=["business", "name"], name="material_biz_name_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "sku"],
                condition=~models.Q(sku="") & models.Q(deleted_at__isnull=True),
                name="unique_material_sku_per_business_when_present",
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def stock_value(self):
        return (self.stock_quantity or Decimal("0.00")) * (self.estimated_unit_cost or Decimal("0.00"))

    def save(self, *args, **kwargs):
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)

    @property
    def usage_count(self):
        return self.consumptions.count()

    @property
    def total_consumed_quantity(self):
        legacy_total = self.consumptions.aggregate(total=Sum("quantity"))["total"] or Decimal("0.00")
        movement_total = (
            self.stock_movement_lines.filter(
                movement__movement_type=StockMovement.MovementType.CONSUMPTION,
            ).aggregate(total=Sum("quantity"))["total"]
            or Decimal("0.00")
        )
        return legacy_total + movement_total

    @property
    def total_consumed_estimated_cost(self):
        legacy_total = self.consumptions.aggregate(total=Sum("estimated_total_cost"))["total"] or Decimal("0.00")
        movement_total = (
            self.stock_movement_lines.filter(
                movement__movement_type=StockMovement.MovementType.CONSUMPTION,
            ).aggregate(total=Sum("estimated_total_cost"))["total"]
            or Decimal("0.00")
        )
        return legacy_total + movement_total

    @property
    def last_consumed_at(self):
        legacy_date = self.consumptions.order_by("-consumed_at", "-id").values_list("consumed_at", flat=True).first()
        movement_date = (
            self.stock_movement_lines.filter(
                movement__movement_type=StockMovement.MovementType.CONSUMPTION,
            )
            .order_by("-movement__occurred_on", "-movement_id", "-id")
            .values_list("movement__occurred_on", flat=True)
            .first()
        )
        if legacy_date and movement_date:
            return max(legacy_date, movement_date)
        return legacy_date or movement_date

    @property
    def open_units_active_count(self):
        return self.open_units.filter(status=MaterialOpenUnit.Status.OPEN).count()

    @property
    def open_units_finished_count(self):
        return self.open_units.filter(status=MaterialOpenUnit.Status.FINISHED).count()

    @property
    def average_jobs_per_finished_unit(self):
        finished_units = list(self.open_units.filter(status=MaterialOpenUnit.Status.FINISHED))
        if not finished_units:
            return Decimal("0.00")
        total_jobs = sum(unit.work_orders_count for unit in finished_units)
        return Decimal(total_jobs) / Decimal(len(finished_units))

    @property
    def average_days_per_finished_unit(self):
        durations = [
            unit.duration_days
            for unit in self.open_units.filter(status=MaterialOpenUnit.Status.FINISHED)
            if unit.duration_days is not None
        ]
        if not durations:
            return Decimal("0.00")
        return Decimal(sum(durations)) / Decimal(len(durations))

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])


class Supplier(SoftDeleteMixin):
    business = models.ForeignKey("core.BusinessAccount", related_name="suppliers", on_delete=models.PROTECT)
    name = models.CharField(max_length=160)
    legal_name = models.CharField(max_length=180, blank=True)
    category = models.CharField(max_length=80, blank=True)
    tax_condition = models.CharField(max_length=80, blank=True)
    website = models.URLField(blank=True)
    contact_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=60, blank=True)
    email = models.EmailField(blank=True)
    tax_id = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=220, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["name"]
        verbose_name = "proveedor"
        verbose_name_plural = "proveedores"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        self.name = self.name.strip()
        self.legal_name = self.legal_name.strip()
        self.category = self.category.strip()
        self.tax_condition = self.tax_condition.strip()
        self.website = self.website.strip()
        self.contact_name = self.contact_name.strip()
        self.tax_id = "".join(character for character in str(self.tax_id) if character.isdigit())
        self.address = self.address.strip()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])


class MaterialOpenUnit(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Abierta"
        FINISHED = "finished", "Finalizada"

    business = models.ForeignKey("core.BusinessAccount", related_name="material_open_units", on_delete=models.PROTECT)
    material = models.ForeignKey(Material, related_name="open_units", on_delete=models.PROTECT)
    opened_at = models.DateField(default=timezone.localdate)
    opened_by_work_order = models.ForeignKey(
        "workorders.WorkOrder",
        related_name="opened_material_units",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    finished_at = models.DateField(null=True, blank=True)
    stock_quantity_to_decrement = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("1.00"))
    estimated_unit_cost_at_open = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    observations = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-opened_at", "-id"]
        verbose_name = "unidad abierta"
        verbose_name_plural = "unidades abiertas"

    def __str__(self):
        return f"{self.material} - unidad {self.id or '-'}"

    def save(self, *args, **kwargs):
        if self.material_id and not self.business_id:
            self.business = self.material.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)

    @property
    def work_orders_count(self):
        return self.consumptions.values("work_order").distinct().count()

    @property
    def consumptions_count(self):
        return self.consumptions.count()

    @property
    def duration_days(self):
        if not self.finished_at:
            return None
        return (self.finished_at - self.opened_at).days + 1


class Tool(SoftDeleteMixin):
    class Status(models.TextChoices):
        IN_USE = "in_use", "En uso"
        MAINTENANCE = "maintenance", "Mantenimiento"
        RETIRED = "retired", "Retirada"

    business = models.ForeignKey("core.BusinessAccount", related_name="tools", on_delete=models.PROTECT)
    name = models.CharField(max_length=140)
    quantity = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_USE)
    unit_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchased_at = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["name"]
        verbose_name = "herramienta"
        verbose_name_plural = "herramientas"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)

    @property
    def total_value(self):
        return Decimal(self.quantity or 0) * (self.unit_value or Decimal("0.00"))

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])


class MaterialPurchase(models.Model):
    business = models.ForeignKey("core.BusinessAccount", related_name="material_purchases", on_delete=models.PROTECT)
    material = models.ForeignKey(Material, related_name="purchases", on_delete=models.PROTECT)
    purchased_at = models.DateField(default=timezone.localdate)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    affects_cash = models.BooleanField(default=True)
    observations = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-purchased_at", "-id"]
        verbose_name = "compra de material"
        verbose_name_plural = "compras de material"
        indexes = [
            models.Index(fields=["business", "-purchased_at"], name="matpur_biz_purchased_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.material_id and not self.business_id:
            self.business = self.material.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)


class MaterialConsumption(models.Model):
    business = models.ForeignKey("core.BusinessAccount", related_name="material_consumptions", on_delete=models.PROTECT)
    work_order = models.ForeignKey(
        "workorders.WorkOrder",
        related_name="material_consumptions",
        on_delete=models.PROTECT,
    )
    material = models.ForeignKey(Material, related_name="consumptions", on_delete=models.PROTECT)
    open_unit = models.ForeignKey(
        MaterialOpenUnit,
        related_name="consumptions",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    consumed_at = models.DateField(default=timezone.localdate)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    estimated_unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    estimated_total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    observations = models.TextField(blank=True)
    is_from_service_recipe = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-consumed_at", "-id"]
        verbose_name = "consumo de material"
        verbose_name_plural = "consumos de material"
        indexes = [
            models.Index(
                fields=["business", "-consumed_at"],
                name="mc_biz_consumed_at_idx",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.work_order_id and not self.business_id:
            self.business = self.work_order.business
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        PURCHASE = "purchase", "Compra"
        INITIAL_STOCK = "initial_stock", "Stock inicial"
        CONSUMPTION = "consumption", "Consumo"
        SALE = "sale", "Venta"

    class DocumentType(models.TextChoices):
        INVOICE_A = "factura_a", "Factura A"
        INVOICE_B = "factura_b", "Factura B"
        INVOICE_C = "factura_c", "Factura C"
        TICKET = "ticket", "Ticket"
        DELIVERY_NOTE = "remito", "Remito"
        OTHER = "otro", "Otro"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Efectivo"
        CARD = "card", "Tarjeta"
        TRANSFER = "transfer", "Transferencia"
        OTHER = "other", "Otro"

    business = models.ForeignKey("core.BusinessAccount", related_name="stock_movements", on_delete=models.PROTECT)
    movement_type = models.CharField(max_length=24, choices=MovementType.choices)
    occurred_on = models.DateField(default=timezone.localdate)
    supplier = models.ForeignKey(
        Supplier,
        related_name="stock_movements",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    customer = models.ForeignKey(
        "customers.Customer",
        related_name="stock_movements",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    reservation = models.ForeignKey(
        "scheduling.Reservation",
        related_name="stock_movements",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    work_order = models.ForeignKey(
        "workorders.WorkOrder",
        related_name="stock_movements",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    document_type = models.CharField(max_length=32, choices=DocumentType.choices, blank=True)
    document_number = models.CharField(max_length=80, blank=True)
    document_file = models.FileField(
        upload_to="stock-movements/",
        blank=True,
        validators=[PROFILE_ASSET_FILE_VALIDATOR],
    )
    affects_cash = models.BooleanField(default=False)
    products_received = models.BooleanField(default=True)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-occurred_on", "-id"]
        verbose_name = "movimiento de stock"
        verbose_name_plural = "movimientos de stock"
        indexes = [
            models.Index(fields=["business", "-occurred_on"], name="stockmv_biz_occurred_idx"),
            models.Index(fields=["business", "movement_type", "occurred_on"], name="stockmv_biz_type_occ_idx"),
        ]

    def __str__(self):
        return f"{self.get_movement_type_display()} #{self.id or '-'}"

    def save(self, *args, **kwargs):
        if not self.business_id:
            for field_name in ["supplier", "customer", "reservation", "work_order"]:
                related = getattr(self, field_name, None)
                if related is not None and getattr(related, "business_id", None):
                    self.business = related.business
                    break
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)


class StockMovementLine(models.Model):
    movement = models.ForeignKey(StockMovement, related_name="lines", on_delete=models.CASCADE)
    material = models.ForeignKey(Material, related_name="stock_movement_lines", on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_delta = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "línea de movimiento"
        verbose_name_plural = "líneas de movimiento"

    def __str__(self):
        return f"{self.material} x {self.quantity}"
