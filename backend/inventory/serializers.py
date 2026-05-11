import json
from datetime import datetime, time
from decimal import Decimal

from django.core.exceptions import DisallowedHost
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from core.models import register_expense_classification, register_income_classification
from finance.cash import ensure_cash_day_open, request_user_from_context
from finance.models import CashMovement
from scheduling.services import ensure_reservation_work_order

from .models import (
    Material,
    MaterialConsumption,
    MaterialOpenUnit,
    MaterialPurchase,
    StockMovement,
    StockMovementLine,
    Supplier,
    Tool,
)


def refresh_material_cost(material):
    latest_stock_line = (
        material.stock_movement_lines.filter(
            movement__movement_type__in=[
                StockMovement.MovementType.PURCHASE,
                StockMovement.MovementType.INITIAL_STOCK,
            ],
            stock_delta__gt=0,
            unit_price__gt=0,
        )
        .select_related("movement")
        .order_by("-movement__occurred_on", "-movement_id", "-id")
        .first()
    )
    latest_purchase = material.purchases.order_by("-purchased_at", "-id").first()
    if latest_stock_line and (
        not latest_purchase or latest_stock_line.movement.occurred_on >= latest_purchase.purchased_at
    ):
        material.estimated_unit_cost = latest_stock_line.unit_price
    elif latest_purchase and latest_purchase.quantity > 0:
        material.estimated_unit_cost = latest_purchase.total_cost / latest_purchase.quantity
    else:
        material.estimated_unit_cost = Decimal("0.00")
    material.save(update_fields=["estimated_unit_cost", "updated_at"])


def sync_purchase_cash_movement(purchase, user=None):
    if purchase.affects_cash and purchase.total_cost > 0:
        movement, created = CashMovement.objects.update_or_create(
            material_purchase=purchase,
            defaults={
                "movement_type": CashMovement.MovementType.EXPENSE,
                "category": "Materiales e insumos",
                "subcategory": purchase.material.name or "Compra de materiales",
                "amount": purchase.total_cost,
                "occurred_at": timezone.make_aware(datetime.combine(purchase.purchased_at, time.min)),
                "description": f"Compra de {purchase.material.name}",
            },
        )
        if created and user:
            movement.created_by = user
            movement.save(update_fields=["created_by"])
        register_expense_classification(movement.category, movement.subcategory)
    else:
        CashMovement.objects.filter(material_purchase=purchase).delete()


def stock_movement_affects_cash(movement_type, affects_cash):
    if movement_type == StockMovement.MovementType.SALE:
        return True
    return movement_type == StockMovement.MovementType.PURCHASE and bool(affects_cash)


def sync_stock_movement_cash_movement(movement, user=None):
    if movement.movement_type == StockMovement.MovementType.PURCHASE and movement.affects_cash and movement.total_amount > 0:
        movement_record, created = CashMovement.objects.update_or_create(
            stock_movement=movement,
            defaults={
                "movement_type": CashMovement.MovementType.EXPENSE,
                "category": "Materiales e insumos",
                "subcategory": movement.supplier.name if movement.supplier_id else "Compra de materiales",
                "amount": movement.total_amount,
                "occurred_at": timezone.make_aware(datetime.combine(movement.occurred_on, time.min)),
                "description": f"Compra de materiales #{movement.id}",
            },
        )
        if created and user:
            movement_record.created_by = user
            movement_record.save(update_fields=["created_by"])
        register_expense_classification(movement_record.category, movement_record.subcategory)
        return

    if movement.movement_type == StockMovement.MovementType.SALE and movement.total_amount > 0:
        movement_record, created = CashMovement.objects.update_or_create(
            stock_movement=movement,
            defaults={
                "movement_type": CashMovement.MovementType.INCOME,
                "category": "Venta",
                "subcategory": movement.get_payment_method_display(),
                "amount": movement.total_amount,
                "occurred_at": timezone.make_aware(datetime.combine(movement.occurred_on, time.min)),
                "description": f"Venta de materiales a {movement.customer.name if movement.customer_id else 'cliente'}",
            },
        )
        if created and user:
            movement_record.created_by = user
            movement_record.save(update_fields=["created_by"])
        register_income_classification(movement_record.category, movement_record.subcategory)
        return

    CashMovement.objects.filter(stock_movement=movement).delete()


def reverse_stock_movement_effects(movement):
    touched_material_ids = set()
    for line in movement.lines.select_related("material").select_for_update():
        material = line.material
        next_stock = material.stock_quantity - line.stock_delta
        if next_stock < 0:
            raise serializers.ValidationError({"lines": "No se puede revertir el movimiento: el stock quedaria negativo."})
        material.stock_quantity = next_stock
        material.save(update_fields=["stock_quantity", "updated_at"])
        touched_material_ids.add(material.id)
    CashMovement.objects.filter(stock_movement=movement).delete()
    movement.lines.all().delete()
    for material in Material.objects.filter(id__in=touched_material_ids):
        refresh_material_cost(material)


def stock_delta_for(movement, quantity):
    if movement.movement_type == StockMovement.MovementType.PURCHASE:
        return quantity if movement.products_received else Decimal("0.00")
    if movement.movement_type == StockMovement.MovementType.INITIAL_STOCK:
        return quantity
    if movement.movement_type in [StockMovement.MovementType.CONSUMPTION, StockMovement.MovementType.SALE]:
        return -quantity
    return Decimal("0.00")


def apply_stock_movement_lines(movement, lines_data, user=None):
    total_amount = Decimal("0.00")
    touched_material_ids = set()
    for line_data in lines_data:
        material = Material.objects.select_for_update().get(pk=line_data["material"].pk)
        quantity = line_data["quantity"]
        unit_price = line_data.get("unit_price") or Decimal("0.00")

        if movement.movement_type == StockMovement.MovementType.CONSUMPTION:
            estimated_unit_cost = material.estimated_unit_cost or Decimal("0.00")
            line_total = estimated_unit_cost * quantity
            estimated_total_cost = line_total
            unit_price = unit_price or estimated_unit_cost
        elif movement.movement_type == StockMovement.MovementType.SALE:
            line_total = unit_price * quantity
            estimated_unit_cost = material.estimated_unit_cost or Decimal("0.00")
            estimated_total_cost = estimated_unit_cost * quantity
        else:
            line_total = unit_price * quantity
            estimated_unit_cost = unit_price
            estimated_total_cost = line_total

        stock_delta = stock_delta_for(movement, quantity)
        next_stock = material.stock_quantity + stock_delta
        if next_stock < 0:
            raise serializers.ValidationError(
                {"lines": f"Stock insuficiente para {material.name}."}
            )
        material.stock_quantity = next_stock
        material.save(update_fields=["stock_quantity", "updated_at"])
        touched_material_ids.add(material.id)

        StockMovementLine.objects.create(
            movement=movement,
            material=material,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total,
            estimated_unit_cost=estimated_unit_cost,
            estimated_total_cost=estimated_total_cost,
            stock_delta=stock_delta,
        )
        total_amount += line_total

    movement.total_amount = total_amount
    movement.save(update_fields=["total_amount", "updated_at"])
    for material in Material.objects.filter(id__in=touched_material_ids):
        refresh_material_cost(material)
    sync_stock_movement_cash_movement(movement, user=user)


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "legal_name",
            "category",
            "tax_condition",
            "website",
            "contact_name",
            "phone",
            "email",
            "tax_id",
            "address",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("El nombre es obligatorio.")
        return name

    def validate_tax_id(self, value):
        return "".join(character for character in str(value) if character.isdigit())

    def validate_address(self, value):
        return value.strip()

    def validate_legal_name(self, value):
        return value.strip()

    def validate_category(self, value):
        return value.strip()

    def validate_tax_condition(self, value):
        return value.strip()

    def validate_website(self, value):
        return value.strip()


class SupplierListSerializer(SupplierSerializer):
    list_insights = serializers.SerializerMethodField()

    class Meta(SupplierSerializer.Meta):
        fields = [*SupplierSerializer.Meta.fields, "list_insights"]
        read_only_fields = [*SupplierSerializer.Meta.read_only_fields, "list_insights"]

    def get_list_insights(self, obj):
        return self.context.get("supplier_list_insights_map", {}).get(
            obj.id,
            {
                "purchase_count": 0,
                "total_purchased": Decimal("0.00"),
                "last_purchase_on": None,
                "pending_reception_count": 0,
                "materials_count": 0,
                "has_pending_reception": False,
            },
        )


class MaterialSerializer(serializers.ModelSerializer):
    last_purchase_unit_cost = serializers.SerializerMethodField()
    last_purchase_date = serializers.SerializerMethodField()
    stock_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    usage_count = serializers.IntegerField(read_only=True)
    total_consumed_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_consumed_estimated_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    last_consumed_at = serializers.DateField(read_only=True, allow_null=True)
    open_units_active_count = serializers.IntegerField(read_only=True)
    open_units_finished_count = serializers.IntegerField(read_only=True)
    average_jobs_per_finished_unit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    average_days_per_finished_unit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Material
        fields = [
            "id",
            "name",
            "unit",
            "category",
            "sku",
            "presentation",
            "stock_quantity",
            "minimum_stock",
            "estimated_unit_cost",
            "last_purchase_unit_cost",
            "last_purchase_date",
            "stock_value",
            "usage_count",
            "total_consumed_quantity",
            "total_consumed_estimated_cost",
            "last_consumed_at",
            "open_units_active_count",
            "open_units_finished_count",
            "average_jobs_per_finished_unit",
            "average_days_per_finished_unit",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "estimated_unit_cost",
            "last_purchase_unit_cost",
            "last_purchase_date",
            "stock_value",
            "usage_count",
            "total_consumed_quantity",
            "total_consumed_estimated_cost",
            "last_consumed_at",
            "open_units_active_count",
            "open_units_finished_count",
            "average_jobs_per_finished_unit",
            "average_days_per_finished_unit",
            "created_at",
            "updated_at",
        ]

    def get_last_purchase_unit_cost(self, obj):
        purchase = obj.purchases.order_by("-purchased_at", "-id").first()
        if not purchase or purchase.quantity <= 0:
            return None
        return purchase.total_cost / purchase.quantity

    def get_last_purchase_date(self, obj):
        purchase = obj.purchases.order_by("-purchased_at", "-id").first()
        return purchase.purchased_at if purchase else None

    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("El stock no puede ser negativo.")
        return value

    def validate_minimum_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("El stock minimo no puede ser negativo.")
        return value

    def validate_sku(self, value):
        sku = value.strip()
        if not sku:
            return ""
        queryset = Material.objects.filter(sku=sku)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Ya existe un material con este SKU.")
        return sku


class ToolSerializer(serializers.ModelSerializer):
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Tool
        fields = [
            "id",
            "name",
            "quantity",
            "status",
            "unit_value",
            "purchased_at",
            "total_value",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "total_value", "created_at", "updated_at"]

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("La cantidad no puede ser negativa.")
        return value

    def validate_unit_value(self, value):
        if value < 0:
            raise serializers.ValidationError("El valor no puede ser negativo.")
        return value


class StockMovementLineInputSerializer(serializers.Serializer):
    material = serializers.PrimaryKeyRelatedField(queryset=Material.objects.filter(is_active=True))
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio unitario no puede ser negativo.")
        return value


class StockMovementLineSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    material_unit = serializers.CharField(source="material.unit", read_only=True)

    class Meta:
        model = StockMovementLine
        fields = [
            "id",
            "material",
            "material_name",
            "material_unit",
            "quantity",
            "unit_price",
            "line_total",
            "estimated_unit_cost",
            "estimated_total_cost",
            "stock_delta",
            "created_at",
        ]
        read_only_fields = fields


class StockMovementLinesField(serializers.Field):
    def to_internal_value(self, data):
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError("Las lineas deben ser un JSON valido.") from exc
        if not isinstance(data, list):
            raise serializers.ValidationError("Las lineas deben ser una lista.")
        serializer = StockMovementLineInputSerializer(data=data, many=True)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def to_representation(self, value):
        queryset = value.all().select_related("material") if hasattr(value, "all") else value
        return StockMovementLineSerializer(queryset, many=True).data


class StockMovementSerializer(serializers.ModelSerializer):
    movement_type_label = serializers.CharField(source="get_movement_type_display", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    reservation_label = serializers.SerializerMethodField()
    work_order_label = serializers.SerializerMethodField()
    document_type_label = serializers.CharField(source="get_document_type_display", read_only=True)
    document_file_url = serializers.SerializerMethodField()
    payment_method_label = serializers.CharField(source="get_payment_method_display", read_only=True)
    lines = StockMovementLinesField(required=False)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "movement_type",
            "movement_type_label",
            "occurred_on",
            "supplier",
            "supplier_name",
            "customer",
            "customer_name",
            "reservation",
            "reservation_label",
            "work_order",
            "work_order_label",
            "document_type",
            "document_type_label",
            "document_number",
            "document_file",
            "document_file_url",
            "affects_cash",
            "products_received",
            "payment_method",
            "payment_method_label",
            "total_amount",
            "notes",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "movement_type_label",
            "supplier_name",
            "customer_name",
            "reservation_label",
            "work_order",
            "work_order_label",
            "document_type_label",
            "document_file_url",
            "payment_method_label",
            "total_amount",
            "created_at",
            "updated_at",
        ]

    def get_reservation_label(self, obj):
        return str(obj.reservation) if obj.reservation_id else None

    def get_work_order_label(self, obj):
        return str(obj.work_order) if obj.work_order_id else None

    def get_document_file_url(self, obj):
        if not obj.document_file:
            return None
        request = self.context.get("request")
        if request is None:
            return obj.document_file.url
        try:
            return request.build_absolute_uri(obj.document_file.url)
        except DisallowedHost:
            return obj.document_file.url

    def validate(self, attrs):
        lines_data = attrs.get("lines")
        if self.instance is None and not lines_data:
            raise serializers.ValidationError({"lines": "Agrega al menos un producto."})

        movement_type = attrs.get("movement_type", getattr(self.instance, "movement_type", None))
        occurred_on = attrs.get("occurred_on", getattr(self.instance, "occurred_on", timezone.localdate()))
        affects_cash = attrs.get("affects_cash", getattr(self.instance, "affects_cash", False))
        reservation = attrs.get("reservation", getattr(self.instance, "reservation", None))
        customer = attrs.get("customer", getattr(self.instance, "customer", None))

        if self.instance and stock_movement_affects_cash(self.instance.movement_type, self.instance.affects_cash):
            ensure_cash_day_open(self.instance.occurred_on, field="occurred_on")

        if stock_movement_affects_cash(movement_type, affects_cash):
            ensure_cash_day_open(occurred_on, field="occurred_on")

        if movement_type == StockMovement.MovementType.CONSUMPTION:
            if not reservation:
                raise serializers.ValidationError({"reservation": "Selecciona una reserva para registrar el consumo."})
            order = ensure_reservation_work_order(reservation)
            if order is None:
                raise serializers.ValidationError(
                    {"reservation": "La reserva debe estar confirmada o completada para consumir materiales."}
                )
            attrs["work_order"] = order
            attrs["customer"] = reservation.customer
            attrs["affects_cash"] = False
            attrs["products_received"] = True
        elif movement_type == StockMovement.MovementType.SALE:
            if not customer:
                raise serializers.ValidationError({"customer": "Selecciona un cliente para registrar la venta."})
            attrs["affects_cash"] = True
            attrs["products_received"] = True
        elif movement_type == StockMovement.MovementType.INITIAL_STOCK:
            attrs["affects_cash"] = False
            attrs["products_received"] = True
        elif movement_type == StockMovement.MovementType.PURCHASE:
            attrs.setdefault("products_received", getattr(self.instance, "products_received", False))
        else:
            raise serializers.ValidationError({"movement_type": "Tipo de movimiento invalido."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop("lines")
        movement = StockMovement.objects.create(**validated_data)
        apply_stock_movement_lines(
            movement,
            lines_data,
            user=request_user_from_context(self.context),
        )
        return movement

    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        if lines_data is None:
            lines_data = [
                {
                    "material": line.material,
                    "quantity": line.quantity,
                    "unit_price": line.unit_price,
                }
                for line in instance.lines.select_related("material")
            ]

        reverse_stock_movement_effects(instance)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        apply_stock_movement_lines(
            instance,
            lines_data,
            user=request_user_from_context(self.context),
        )
        return instance


class MaterialOpenUnitSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    opened_by_work_order_label = serializers.SerializerMethodField()
    work_orders_count = serializers.IntegerField(read_only=True)
    consumptions_count = serializers.IntegerField(read_only=True)
    duration_days = serializers.IntegerField(read_only=True, allow_null=True)
    consumptions = serializers.SerializerMethodField()

    class Meta:
        model = MaterialOpenUnit
        fields = [
            "id",
            "material",
            "material_name",
            "opened_at",
            "opened_by_work_order",
            "opened_by_work_order_label",
            "status",
            "finished_at",
            "stock_quantity_to_decrement",
            "estimated_unit_cost_at_open",
            "work_orders_count",
            "consumptions_count",
            "duration_days",
            "consumptions",
            "observations",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "material_name",
            "opened_by_work_order_label",
            "status",
            "finished_at",
            "estimated_unit_cost_at_open",
            "work_orders_count",
            "consumptions_count",
            "duration_days",
            "consumptions",
            "created_at",
        ]

    def get_opened_by_work_order_label(self, obj):
        return str(obj.opened_by_work_order) if obj.opened_by_work_order else None

    def get_consumptions(self, obj):
        return [
            {
                "id": consumption.id,
                "work_order": consumption.work_order_id,
                "work_order_label": str(consumption.work_order),
                "consumed_at": consumption.consumed_at,
                "quantity": consumption.quantity,
                "estimated_total_cost": consumption.estimated_total_cost,
                "observations": consumption.observations,
            }
            for consumption in obj.consumptions.select_related("work_order").order_by("consumed_at", "id")
        ]

    def validate_stock_quantity_to_decrement(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad a descontar debe ser mayor a cero.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        material = Material.objects.select_for_update().get(pk=validated_data["material"].pk)
        stock_quantity_to_decrement = validated_data.get("stock_quantity_to_decrement", Decimal("1.00"))
        if material.stock_quantity < stock_quantity_to_decrement:
            raise serializers.ValidationError({"material": "Stock insuficiente para abrir una unidad."})
        return MaterialOpenUnit.objects.create(
            **validated_data,
            estimated_unit_cost_at_open=material.estimated_unit_cost or Decimal("0.00"),
        )


class MaterialPurchaseSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)

    class Meta:
        model = MaterialPurchase
        fields = [
            "id",
            "material",
            "material_name",
            "purchased_at",
            "quantity",
            "total_cost",
            "affects_cash",
            "observations",
            "created_at",
        ]
        read_only_fields = ["id", "material_name", "created_at"]

    def validate(self, attrs):
        quantity = attrs.get("quantity", getattr(self.instance, "quantity", None))
        total_cost = attrs.get("total_cost", getattr(self.instance, "total_cost", None))
        purchased_at = attrs.get("purchased_at", getattr(self.instance, "purchased_at", timezone.localdate()))
        affects_cash = attrs.get("affects_cash", getattr(self.instance, "affects_cash", True))
        if quantity is not None and quantity <= 0:
            raise serializers.ValidationError({"quantity": "La cantidad debe ser mayor a cero."})
        if total_cost is not None and total_cost < 0:
            raise serializers.ValidationError({"total_cost": "El costo no puede ser negativo."})
        if self.instance and self.instance.affects_cash and self.instance.total_cost > 0:
            ensure_cash_day_open(self.instance.purchased_at, field="purchased_at")
        if affects_cash and total_cost and total_cost > 0:
            ensure_cash_day_open(purchased_at, field="purchased_at")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        material = Material.objects.select_for_update().get(pk=validated_data["material"].pk)
        purchase = MaterialPurchase.objects.create(**validated_data)
        material.stock_quantity += purchase.quantity
        material.save(update_fields=["stock_quantity", "updated_at"])
        refresh_material_cost(material)
        sync_purchase_cash_movement(purchase, user=request_user_from_context(self.context))
        return purchase

    @transaction.atomic
    def update(self, instance, validated_data):
        old_material = Material.objects.select_for_update().get(pk=instance.material_id)
        new_material = validated_data.get("material", instance.material)
        if new_material.pk == old_material.pk:
            new_material = old_material
        else:
            new_material = Material.objects.select_for_update().get(pk=new_material.pk)

        old_quantity = instance.quantity
        new_quantity = validated_data.get("quantity", old_quantity)

        if old_material.pk == new_material.pk:
            next_stock = old_material.stock_quantity - old_quantity + new_quantity
            if next_stock < 0:
                raise serializers.ValidationError({"quantity": "El cambio dejaria el stock en negativo."})
            old_material.stock_quantity = next_stock
            old_material.save(update_fields=["stock_quantity", "updated_at"])
        else:
            if old_material.stock_quantity < old_quantity:
                raise serializers.ValidationError({"quantity": "No se puede mover esta compra: el stock quedaria negativo."})
            old_material.stock_quantity -= old_quantity
            new_material.stock_quantity += new_quantity
            old_material.save(update_fields=["stock_quantity", "updated_at"])
            new_material.save(update_fields=["stock_quantity", "updated_at"])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        refresh_material_cost(old_material)
        if old_material.pk != new_material.pk:
            refresh_material_cost(new_material)
        sync_purchase_cash_movement(instance)
        return instance


class MaterialConsumptionSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    open_unit_label = serializers.SerializerMethodField()
    consumption_mode = serializers.SerializerMethodField()
    work_order_label = serializers.SerializerMethodField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    class Meta:
        model = MaterialConsumption
        fields = [
            "id",
            "work_order",
            "work_order_label",
            "material",
            "material_name",
            "open_unit",
            "open_unit_label",
            "consumption_mode",
            "consumed_at",
            "quantity",
            "estimated_unit_cost",
            "estimated_total_cost",
            "observations",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "work_order_label",
            "material_name",
            "open_unit_label",
            "consumption_mode",
            "estimated_unit_cost",
            "estimated_total_cost",
            "created_at",
        ]

    def get_work_order_label(self, obj):
        return str(obj.work_order)

    def get_open_unit_label(self, obj):
        return str(obj.open_unit) if obj.open_unit else None

    def get_consumption_mode(self, obj):
        return "open_unit" if obj.open_unit_id else "direct"

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("La cantidad no puede ser negativa.")
        return value

    def validate(self, attrs):
        open_unit = attrs.get("open_unit", getattr(self.instance, "open_unit", None))
        quantity = attrs.get("quantity", getattr(self.instance, "quantity", None))
        material = attrs.get("material", getattr(self.instance, "material", None))

        if open_unit:
            if self.instance and self.instance.open_unit_id and open_unit.pk != self.instance.open_unit_id:
                raise serializers.ValidationError({"open_unit": "No se puede cambiar la unidad abierta del consumo."})
            if self.instance and not self.instance.open_unit_id:
                raise serializers.ValidationError({"open_unit": "No se puede convertir un consumo directo en uso de unidad abierta."})
            if open_unit.status != MaterialOpenUnit.Status.OPEN and not self.instance:
                raise serializers.ValidationError({"status": "La unidad abierta ya fue finalizada."})
            if material and material.pk != open_unit.material_id:
                raise serializers.ValidationError({"material": "El material debe coincidir con la unidad abierta."})
            if quantity is not None and quantity != Decimal("0.00"):
                raise serializers.ValidationError({"quantity": "Los usos de unidad abierta no descuentan cantidad directa."})
            attrs["material"] = open_unit.material
            attrs["quantity"] = Decimal("0.00")
            return attrs

        if self.instance and self.instance.open_unit_id:
            if "material" in attrs and attrs["material"].pk != self.instance.material_id:
                raise serializers.ValidationError({"material": "No se puede cambiar el material de un uso de unidad abierta."})
            if "quantity" in attrs and attrs["quantity"] != self.instance.quantity:
                raise serializers.ValidationError({"quantity": "No se puede cambiar la cantidad de un uso de unidad abierta."})
            return attrs

        if "open_unit" in attrs and attrs["open_unit"] is None:
            attrs.pop("open_unit")
        if quantity is None or quantity <= 0:
            raise serializers.ValidationError({"quantity": "La cantidad debe ser mayor a cero."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        open_unit = validated_data.get("open_unit")
        if open_unit:
            open_unit = MaterialOpenUnit.objects.select_for_update().select_related("material").get(pk=open_unit.pk)
            if open_unit.status != MaterialOpenUnit.Status.OPEN:
                raise serializers.ValidationError({"status": "La unidad abierta ya fue finalizada."})
            unit_cost = open_unit.estimated_unit_cost_at_open or Decimal("0.00")
            validated_data["material"] = open_unit.material
            validated_data["quantity"] = Decimal("0.00")
            return MaterialConsumption.objects.create(
                **validated_data,
                estimated_unit_cost=unit_cost,
                estimated_total_cost=Decimal("0.00"),
            )

        material = Material.objects.select_for_update().get(pk=validated_data["material"].pk)
        quantity = validated_data["quantity"]
        if material.stock_quantity < quantity:
            raise serializers.ValidationError({"quantity": "Stock insuficiente para registrar el consumo."})
        unit_cost = material.estimated_unit_cost or Decimal("0.00")
        consumption = MaterialConsumption.objects.create(
            **validated_data,
            estimated_unit_cost=unit_cost,
            estimated_total_cost=unit_cost * quantity,
        )
        material.stock_quantity -= quantity
        material.save(update_fields=["stock_quantity", "updated_at"])
        return consumption

    @transaction.atomic
    def update(self, instance, validated_data):
        if instance.open_unit_id:
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.material = instance.open_unit.material
            instance.quantity = Decimal("0.00")
            instance.estimated_unit_cost = instance.open_unit.estimated_unit_cost_at_open or Decimal("0.00")
            instance.estimated_total_cost = Decimal("0.00")
            instance.save()
            return instance

        old_material = Material.objects.select_for_update().get(pk=instance.material_id)
        new_material = validated_data.get("material", instance.material)
        if new_material.pk == old_material.pk:
            new_material = old_material
        else:
            new_material = Material.objects.select_for_update().get(pk=new_material.pk)

        old_quantity = instance.quantity
        new_quantity = validated_data.get("quantity", old_quantity)
        stock_changed = old_material.pk != new_material.pk or old_quantity != new_quantity

        if stock_changed:
            if old_material.pk == new_material.pk:
                next_stock = old_material.stock_quantity + old_quantity - new_quantity
                if next_stock < 0:
                    raise serializers.ValidationError({"quantity": "Stock insuficiente para este consumo."})
                old_material.stock_quantity = next_stock
                old_material.save(update_fields=["stock_quantity", "updated_at"])
            else:
                old_material.stock_quantity += old_quantity
                if new_material.stock_quantity < new_quantity:
                    raise serializers.ValidationError({"quantity": "Stock insuficiente para este consumo."})
                new_material.stock_quantity -= new_quantity
                old_material.save(update_fields=["stock_quantity", "updated_at"])
                new_material.save(update_fields=["stock_quantity", "updated_at"])

            unit_cost = new_material.estimated_unit_cost or Decimal("0.00")
            validated_data["estimated_unit_cost"] = unit_cost
            validated_data["estimated_total_cost"] = unit_cost * new_quantity

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
