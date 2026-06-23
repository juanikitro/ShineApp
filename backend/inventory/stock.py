"""Motor de dominio de inventario: mutacion de stock y sus side-effects.

Estas funciones vivian en `inventory/serializers.py`; se movieron aca para que
la logica de negocio de stock (deltas, costo estimado, espejo en caja) sea
descubrible y reusable, en linea con el precedente del repo (`finance/cash.py`,
`fixed_expenses/materialization.py`, `workorders/metrics.py`).

Ver docs/registro/decisiones/2026-06-12-modulos-dominio-vs-serializers.md

Los serializers siguen orquestando la transaccion (`@transaction.atomic`,
`select_for_update`) y validando; aca solo vive el "que hace" del dominio.
"""

from datetime import datetime, time
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from core.models import register_expense_classification, register_income_classification
from finance.models import CashMovement

from .models import Material, StockMovement, StockMovementLine


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
                "business": purchase.business,
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
        register_expense_classification(movement.category, movement.subcategory, business=purchase.business)
    else:
        CashMovement.objects.filter(material_purchase=purchase).hard_delete()


def stock_movement_affects_cash(movement_type, affects_cash):
    if movement_type == StockMovement.MovementType.SALE:
        return True
    return movement_type == StockMovement.MovementType.PURCHASE and bool(affects_cash)


def sync_stock_movement_cash_movement(movement, user=None):
    if movement.movement_type == StockMovement.MovementType.PURCHASE and movement.affects_cash and movement.total_amount > 0:
        movement_record, created = CashMovement.objects.update_or_create(
            stock_movement=movement,
            defaults={
                "business": movement.business,
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
        register_expense_classification(movement_record.category, movement_record.subcategory, business=movement.business)
        return

    if movement.movement_type == StockMovement.MovementType.SALE and movement.total_amount > 0:
        movement_record, created = CashMovement.objects.update_or_create(
            stock_movement=movement,
            defaults={
                "business": movement.business,
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
        register_income_classification(movement_record.category, movement_record.subcategory, business=movement.business)
        return

    CashMovement.objects.filter(stock_movement=movement).hard_delete()


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
    CashMovement.objects.filter(stock_movement=movement).hard_delete()
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
