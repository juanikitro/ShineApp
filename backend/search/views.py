from django.db.models import Q
from rest_framework import permissions, views
from rest_framework.response import Response

from catalog.models import Service
from core.permissions import ActiveBusinessUser, business_from_request, can_view_economy
from customers.models import Customer, Vehicle
from debts.models import Debt
from finance.models import CashMovement
from fixed_expenses.models import FixedExpense
from inventory.models import Material, Supplier, Tool
from quotes.models import Quote
from scheduling.models import Reservation
from tasks.models import Task
from workorders.models import WorkOrder

_DEFAULT_LIMIT = 5
_MAX_LIMIT = 20
_MIN_QUERY_LEN = 2


def _limit_from_params(params):
    try:
        return max(1, min(int(params.get("limit", _DEFAULT_LIMIT)), _MAX_LIMIT))
    except (ValueError, TypeError):
        return _DEFAULT_LIMIT


def _search_customers(business, q, limit):
    qs = (
        Customer.objects.filter(business=business)
        .filter(
            Q(name__icontains=q)
            | Q(email__icontains=q)
            | Q(phone__icontains=q)
            | Q(tax_id__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.name,
            "sublabel": " · ".join(filter(None, [obj.phone, obj.email])),
            "detail_path": f"/customers/{obj.id}",
        }
        for obj in qs
    ]


def _search_vehicles(business, q, limit):
    qs = (
        Vehicle.objects.filter(business=business)
        .select_related("customer")
        .filter(
            Q(license_plate__icontains=q)
            | Q(brand__icontains=q)
            | Q(model__icontains=q)
            | Q(color__icontains=q)
            | Q(customer__name__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": f"{obj.license_plate} — {obj.brand} {obj.model}".strip(" —"),
            "sublabel": obj.customer.name if obj.customer_id else "",
            "detail_path": f"/vehicles/{obj.id}",
        }
        for obj in qs
    ]


def _search_reservations(business, q, limit):
    qs = (
        Reservation.objects.filter(business=business)
        .select_related("customer", "vehicle", "service")
        .filter(
            Q(notes__icontains=q)
            | Q(customer__name__icontains=q)
            | Q(vehicle__license_plate__icontains=q)
            | Q(service__name__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.customer.name if obj.customer_id else f"Reserva #{obj.id}",
            "sublabel": f"{obj.day} — {obj.get_status_display()}",
            "detail_path": f"/reservations/{obj.id}",
        }
        for obj in qs
    ]


def _search_work_orders(business, q, limit):
    qs = (
        WorkOrder.objects.filter(business=business)
        .select_related("customer", "vehicle", "service", "reservation")
        .filter(
            Q(internal_notes__icontains=q)
            | Q(customer__name__icontains=q)
            | Q(vehicle__license_plate__icontains=q)
            | Q(service__name__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.customer.name if obj.customer_id else f"Orden #{obj.id}",
            "sublabel": (
                f"{obj.service.name} — {obj.reservation.get_status_display()}"
                if obj.service_id and obj.reservation_id
                else (obj.service.name if obj.service_id else "")
            ),
            "detail_path": f"/work-orders/{obj.id}",
        }
        for obj in qs
    ]


def _search_cash_movements(business, q, limit):
    qs = (
        CashMovement.objects.filter(business=business)
        .select_related("payment__work_order__customer")
        .filter(
            Q(description__icontains=q)
            | Q(category__icontains=q)
            | Q(subcategory__icontains=q)
            | Q(payment__work_order__customer__name__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.description or obj.category or f"Movimiento #{obj.id}",
            "sublabel": f"{obj.get_movement_type_display()} — ${obj.amount}",
            "detail_path": f"/cash-movements/{obj.id}",
        }
        for obj in qs
    ]


def _search_services(business, q, limit):
    qs = (
        Service.objects.filter(business=business)
        .filter(Q(name__icontains=q) | Q(notes__icontains=q))[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.name,
            "sublabel": f"${obj.base_price}",
            "detail_path": f"/services/{obj.id}",
        }
        for obj in qs
    ]


def _search_materials(business, q, limit):
    qs = (
        Material.objects.filter(business=business)
        .filter(
            Q(name__icontains=q)
            | Q(sku__icontains=q)
            | Q(category__icontains=q)
            | Q(notes__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.name,
            "sublabel": " · ".join(filter(None, [obj.sku, obj.category])),
            "detail_path": f"/materials/{obj.id}",
        }
        for obj in qs
    ]


def _search_suppliers(business, q, limit):
    qs = (
        Supplier.objects.filter(business=business)
        .filter(
            Q(name__icontains=q)
            | Q(legal_name__icontains=q)
            | Q(contact_name__icontains=q)
            | Q(email__icontains=q)
            | Q(phone__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.name,
            "sublabel": " · ".join(filter(None, [obj.contact_name, obj.email, obj.phone])),
            "detail_path": f"/suppliers/{obj.id}",
        }
        for obj in qs
    ]


def _search_tools(business, q, limit):
    qs = (
        Tool.objects.filter(business=business)
        .filter(Q(name__icontains=q) | Q(notes__icontains=q))[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.name,
            "sublabel": obj.get_status_display() if obj.status else "",
            "detail_path": f"/tools/{obj.id}",
        }
        for obj in qs
    ]


def _search_quotes(business, q, limit):
    qs = (
        Quote.objects.filter(business=business)
        .select_related("customer")
        .filter(
            Q(observations__icontains=q)
            | Q(public_code__icontains=q)
            | Q(customer__name__icontains=q)
            | Q(customer_snapshot_name__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": (
                obj.customer.name
                if obj.customer_id
                else obj.customer_snapshot_name or f"Cotización #{obj.id}"
            ),
            "sublabel": f"{obj.quote_date} — {obj.get_status_display()}",
            "detail_path": f"/quotes/{obj.id}",
        }
        for obj in qs
    ]


def _search_debts(business, q, limit):
    qs = (
        Debt.objects.filter(business=business)
        .select_related("supplier")
        .filter(
            Q(concept__icontains=q)
            | Q(creditor__icontains=q)
            | Q(notes__icontains=q)
            | Q(supplier__name__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.concept,
            "sublabel": obj.creditor or (obj.supplier.name if obj.supplier_id else ""),
            "detail_path": f"/debts/{obj.id}",
        }
        for obj in qs
    ]


def _search_tasks(business, q, limit, *, user=None, is_economy=True):
    qs = (
        Task.objects.filter(business=business)
        .select_related("assignee", "created_by")
        .filter(
            Q(title__icontains=q)
            | Q(description__icontains=q)
            | Q(assignee__username__icontains=q)
            | Q(assignee__first_name__icontains=q)
            | Q(assignee__last_name__icontains=q)
        )
    )
    if not is_economy and user is not None and getattr(user, "is_authenticated", False):
        qs = qs.filter(assignee=user)
    qs = qs[:limit]
    return [
        {
            "id": obj.id,
            "label": obj.title,
            "sublabel": " · ".join(
                filter(None, [obj.get_priority_display(), obj.get_status_display()])
            ),
            "detail_path": f"/tasks/{obj.id}",
        }
        for obj in qs
    ]


def _search_fixed_expenses(business, q, limit):
    qs = (
        FixedExpense.objects.filter(business=business)
        .select_related("supplier")
        .filter(
            Q(concept__icontains=q)
            | Q(notes__icontains=q)
            | Q(supplier__name__icontains=q)
        )[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": obj.concept,
            "sublabel": obj.supplier.name if obj.supplier_id else "",
            "detail_path": f"/fixed-expenses/{obj.id}",
        }
        for obj in qs
    ]


_PUBLIC_SEARCHERS = [
    ("customer", "Clientes", _search_customers),
    ("vehicle", "Vehículos", _search_vehicles),
    ("reservation", "Reservas", _search_reservations),
    ("work_order", "Órdenes de trabajo", _search_work_orders),
    ("service", "Servicios", _search_services),
]

_ECONOMY_SEARCHERS = [
    ("cash_movement", "Movimientos de caja", _search_cash_movements),
    ("material", "Materiales", _search_materials),
    ("supplier", "Proveedores", _search_suppliers),
    ("tool", "Herramientas", _search_tools),
    ("quote", "Cotizaciones", _search_quotes),
    ("debt", "Deudas", _search_debts),
    ("fixed_expense", "Gastos fijos", _search_fixed_expenses),
]


class GlobalSearchView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, ActiveBusinessUser]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < _MIN_QUERY_LEN:
            return Response({"query": q, "groups": []})

        limit = _limit_from_params(request.query_params)
        business = business_from_request(request)
        is_economy = can_view_economy(request.user)

        searchers = list(_PUBLIC_SEARCHERS)
        if is_economy:
            searchers.extend(_ECONOMY_SEARCHERS)

        groups = []
        for entity_type, label, fn in searchers:
            items = fn(business, q, limit)
            if items:
                groups.append({"type": entity_type, "label": label, "items": items})

        # Tareas: visibles para empleador y empleado, pero el empleado solo ve las suyas.
        task_items = _search_tasks(
            business, q, limit, user=request.user, is_economy=is_economy
        )
        if task_items:
            groups.append({"type": "task", "label": "Tareas", "items": task_items})

        return Response({"query": q, "groups": groups})
