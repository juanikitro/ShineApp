"""Papelera centralizada de registros soft-deleted.

Registra los modelos que el usuario puede ver, restaurar o purgar desde la
seccion de configuracion. Cada entrada del registro declara:

- `key`: identificador estable para URLs (`customer`, `vehicle`, ...).
- `label_singular` / `label_plural`: nombres en castellano para la UI.
- `module`: nombre del modulo origen para audit log.
- `model`: clase del modelo (debe extender `SoftDeleteMixin`).
- `label_field` / `label_callable`: como mostrar cada registro borrado.
- `secondary_callable`: linea secundaria opcional para la card.
- `select_related` / `prefetch_related`: optimizacion de queries.

La cascada inversa (restaurar hijos relacionados) se delega al metodo
`restore()` del modelo, que sigue el mismo patron que su `delete()`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterable

from django.db.models import Model


@dataclass(frozen=True)
class TrashEntry:
    key: str
    label_singular: str
    label_plural: str
    module: str
    model: type[Model]
    label_field: str = ""
    label_callable: Callable[[Model], str] | None = None
    secondary_callable: Callable[[Model], str] | None = None
    select_related: tuple[str, ...] = field(default_factory=tuple)
    prefetch_related: tuple[str, ...] = field(default_factory=tuple)

    def render_label(self, instance: Model) -> str:
        if self.label_callable is not None:
            value = self.label_callable(instance)
        elif self.label_field:
            value = getattr(instance, self.label_field, "") or ""
        else:
            value = str(instance)
        text = str(value or "").strip()
        return text or f"{self.label_singular} #{instance.pk}"

    def render_secondary(self, instance: Model) -> str:
        if self.secondary_callable is None:
            return ""
        try:
            return str(self.secondary_callable(instance) or "").strip()
        except Exception:
            return ""


def _customer_label(instance) -> str:
    return instance.name or f"Cliente #{instance.pk}"


def _vehicle_label(instance) -> str:
    return str(instance) or f"Vehiculo #{instance.pk}"


def _vehicle_secondary(instance) -> str:
    customer = getattr(instance, "customer", None)
    return getattr(customer, "name", "") or ""


def _reservation_label(instance) -> str:
    customer = getattr(instance, "customer", None)
    name = getattr(customer, "name", "") or "Sin cliente"
    return f"{instance.day} - {name}"


def _reservation_secondary(instance) -> str:
    service = getattr(instance, "service", None)
    return getattr(service, "name", "") or ""


def _work_order_label(instance) -> str:
    return f"Orden #{instance.pk}"


def _work_order_secondary(instance) -> str:
    customer = getattr(instance, "customer", None)
    name = getattr(customer, "name", "") or ""
    service = getattr(instance, "service", None)
    service_name = getattr(service, "name", "") or ""
    if name and service_name:
        return f"{name} - {service_name}"
    return name or service_name


def _payment_label(instance) -> str:
    return f"Pago #{instance.pk} - ${instance.amount}"


def _payment_secondary(instance) -> str:
    work_order = getattr(instance, "work_order", None)
    if work_order is None:
        return ""
    customer = getattr(work_order, "customer", None)
    return getattr(customer, "name", "") or f"Orden #{work_order.pk}"


def _cash_movement_label(instance) -> str:
    movement_type = "Ingreso" if instance.movement_type == "income" else "Egreso"
    return f"{movement_type} ${instance.amount}"


def _cash_movement_secondary(instance) -> str:
    parts = [instance.category, instance.subcategory]
    return " - ".join(part for part in parts if part)


def _quote_label(instance) -> str:
    return f"Cotizacion {instance.public_code or instance.pk}"


def _quote_secondary(instance) -> str:
    customer = getattr(instance, "customer", None)
    return getattr(customer, "name", "") or ""


def _debt_label(instance) -> str:
    return instance.concept or f"Deuda #{instance.pk}"


def _debt_secondary(instance) -> str:
    creditor = instance.creditor or ""
    supplier = getattr(instance, "supplier", None)
    supplier_name = getattr(supplier, "name", "") or ""
    return creditor or supplier_name


def _debt_payment_label(instance) -> str:
    return f"Pago deuda #{instance.pk} - ${instance.amount}"


def _debt_payment_secondary(instance) -> str:
    debt = getattr(instance, "debt", None)
    return getattr(debt, "concept", "") or ""


def _fixed_expense_label(instance) -> str:
    return instance.concept or f"Gasto fijo #{instance.pk}"


def _fixed_expense_secondary(instance) -> str:
    return instance.expense_category or ""


def _fixed_expense_occurrence_label(instance) -> str:
    fixed_expense = getattr(instance, "fixed_expense", None)
    concept = getattr(fixed_expense, "concept", "") or "Gasto fijo"
    return f"{concept} - {instance.period_date}"


def _fixed_expense_occurrence_secondary(instance) -> str:
    return f"${instance.amount}"


def build_trash_registry() -> list[TrashEntry]:
    from catalog.models import Sector, Service
    from customers.models import Customer, Vehicle
    from debts.models import Debt, DebtPayment
    from finance.models import CashMovement, Payment
    from fixed_expenses.models import FixedExpense, FixedExpenseOccurrence
    from inventory.models import Material, Supplier, Tool
    from quotes.models import Quote
    from scheduling.models import Reservation
    from workorders.models import WorkOrder

    return [
        TrashEntry(
            key="customer",
            label_singular="Cliente",
            label_plural="Clientes",
            module="customers",
            model=Customer,
            label_callable=_customer_label,
            secondary_callable=lambda instance: instance.phone or instance.email,
        ),
        TrashEntry(
            key="vehicle",
            label_singular="Vehiculo",
            label_plural="Vehiculos",
            module="customers",
            model=Vehicle,
            label_callable=_vehicle_label,
            secondary_callable=_vehicle_secondary,
            select_related=("customer",),
        ),
        TrashEntry(
            key="sector",
            label_singular="Sector",
            label_plural="Sectores",
            module="catalog",
            model=Sector,
            label_field="name",
        ),
        TrashEntry(
            key="service",
            label_singular="Servicio",
            label_plural="Servicios",
            module="catalog",
            model=Service,
            label_field="name",
            secondary_callable=lambda instance: getattr(instance.sector, "name", "") if instance.sector_id else "",
            select_related=("sector",),
        ),
        TrashEntry(
            key="reservation",
            label_singular="Reserva",
            label_plural="Reservas",
            module="scheduling",
            model=Reservation,
            label_callable=_reservation_label,
            secondary_callable=_reservation_secondary,
            select_related=("customer", "service"),
        ),
        TrashEntry(
            key="work-order",
            label_singular="Orden de trabajo",
            label_plural="Ordenes de trabajo",
            module="workorders",
            model=WorkOrder,
            label_callable=_work_order_label,
            secondary_callable=_work_order_secondary,
            select_related=("customer", "service"),
        ),
        TrashEntry(
            key="payment",
            label_singular="Pago",
            label_plural="Pagos",
            module="finance",
            model=Payment,
            label_callable=_payment_label,
            secondary_callable=_payment_secondary,
            select_related=("work_order__customer",),
        ),
        TrashEntry(
            key="cash-movement",
            label_singular="Movimiento de caja",
            label_plural="Movimientos de caja",
            module="finance",
            model=CashMovement,
            label_callable=_cash_movement_label,
            secondary_callable=_cash_movement_secondary,
        ),
        TrashEntry(
            key="material",
            label_singular="Material",
            label_plural="Materiales",
            module="inventory",
            model=Material,
            label_field="name",
            secondary_callable=lambda instance: instance.category,
        ),
        TrashEntry(
            key="supplier",
            label_singular="Proveedor",
            label_plural="Proveedores",
            module="inventory",
            model=Supplier,
            label_field="name",
            secondary_callable=lambda instance: instance.category,
        ),
        TrashEntry(
            key="tool",
            label_singular="Herramienta",
            label_plural="Herramientas",
            module="inventory",
            model=Tool,
            label_field="name",
            secondary_callable=lambda instance: instance.get_status_display(),
        ),
        TrashEntry(
            key="quote",
            label_singular="Cotizacion",
            label_plural="Cotizaciones",
            module="quotes",
            model=Quote,
            label_callable=_quote_label,
            secondary_callable=_quote_secondary,
            select_related=("customer",),
        ),
        TrashEntry(
            key="debt",
            label_singular="Deuda",
            label_plural="Deudas",
            module="debts",
            model=Debt,
            label_callable=_debt_label,
            secondary_callable=_debt_secondary,
            select_related=("supplier",),
        ),
        TrashEntry(
            key="debt-payment",
            label_singular="Pago de deuda",
            label_plural="Pagos de deuda",
            module="debts",
            model=DebtPayment,
            label_callable=_debt_payment_label,
            secondary_callable=_debt_payment_secondary,
            select_related=("debt",),
        ),
        TrashEntry(
            key="fixed-expense",
            label_singular="Gasto fijo",
            label_plural="Gastos fijos",
            module="fixed_expenses",
            model=FixedExpense,
            label_callable=_fixed_expense_label,
            secondary_callable=_fixed_expense_secondary,
        ),
        TrashEntry(
            key="fixed-expense-occurrence",
            label_singular="Ocurrencia gasto fijo",
            label_plural="Ocurrencias gasto fijo",
            module="fixed_expenses",
            model=FixedExpenseOccurrence,
            label_callable=_fixed_expense_occurrence_label,
            secondary_callable=_fixed_expense_occurrence_secondary,
            select_related=("fixed_expense",),
        ),
    ]


_REGISTRY_CACHE: list[TrashEntry] | None = None


def get_trash_registry() -> list[TrashEntry]:
    global _REGISTRY_CACHE
    if _REGISTRY_CACHE is None:
        _REGISTRY_CACHE = build_trash_registry()
    return _REGISTRY_CACHE


def get_trash_entry(key: str) -> TrashEntry | None:
    normalized = str(key or "").strip().lower()
    for entry in get_trash_registry():
        if entry.key == normalized:
            return entry
    return None


def iter_trash_entries() -> Iterable[TrashEntry]:
    return iter(get_trash_registry())
