from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Max, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import decorators, response, serializers, status, viewsets

from core.audit import AuditedModelViewSetMixin, audit_snapshot, record_audit_event
from core.permissions import CanViewEconomy, business_from_request
from debts.models import Debt
from debts.serializers import DebtSerializer
from finance.cash import ensure_cash_day_open
from finance.models import CashMovement
from finance.serializers import CashMovementSerializer

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
from .serializers import (
    MaterialConsumptionSerializer,
    MaterialOpenUnitSerializer,
    MaterialPurchaseSerializer,
    MaterialSerializer,
    MaterialUsageBackfillSerializer,
    ServiceUsageRowSerializer,
    StockMovementSerializer,
    SupplierListSerializer,
    SupplierSerializer,
    ToolSerializer,
)
from .stock import (
    refresh_material_cost,
    reverse_stock_movement_effects,
    stock_movement_affects_cash,
)

ZERO = Decimal("0.00")


def material_list_metrics_defaults():
    return {
        "last_purchase_unit_cost": None,
        "last_purchase_date": None,
        "usage_count": 0,
        "total_consumed_quantity": ZERO,
        "total_consumed_estimated_cost": ZERO,
        "last_consumed_at": None,
        "open_units_active_count": 0,
        "open_units_finished_count": 0,
        "average_jobs_per_finished_unit": ZERO,
        "average_days_per_finished_unit": ZERO,
    }


def average_decimal(total, count):
    if not count:
        return ZERO
    return Decimal(total) / Decimal(count)


def build_material_list_metrics(rows):
    material_ids = [row.id for row in rows]
    metrics = {
        material_id: material_list_metrics_defaults()
        for material_id in material_ids
    }
    if not material_ids:
        return metrics

    seen_purchase_materials = set()
    latest_purchases = (
        MaterialPurchase.objects.filter(material_id__in=material_ids)
        .order_by("material_id", "-purchased_at", "-id")
        .only("material_id", "purchased_at", "quantity", "total_cost")
    )
    for purchase in latest_purchases:
        if purchase.material_id in seen_purchase_materials:
            continue
        seen_purchase_materials.add(purchase.material_id)
        bucket = metrics[purchase.material_id]
        bucket["last_purchase_date"] = purchase.purchased_at
        if purchase.quantity > 0:
            bucket["last_purchase_unit_cost"] = purchase.total_cost / purchase.quantity

    legacy_consumptions = (
        MaterialConsumption.objects.filter(material_id__in=material_ids)
        .values("material_id")
        .annotate(
            usage_count=Count("id"),
            total_quantity=Sum("quantity"),
            total_cost=Sum("estimated_total_cost"),
            last_consumed_at=Max("consumed_at"),
        )
    )
    for row in legacy_consumptions:
        bucket = metrics[row["material_id"]]
        bucket["usage_count"] = row["usage_count"] or 0
        bucket["total_consumed_quantity"] += row["total_quantity"] or ZERO
        bucket["total_consumed_estimated_cost"] += row["total_cost"] or ZERO
        bucket["last_consumed_at"] = row["last_consumed_at"]

    stock_consumptions = (
        StockMovementLine.objects.filter(
            material_id__in=material_ids,
            movement__movement_type=StockMovement.MovementType.CONSUMPTION,
        )
        .values("material_id")
        .annotate(
            total_quantity=Sum("quantity"),
            total_cost=Sum("estimated_total_cost"),
            last_consumed_at=Max("movement__occurred_on"),
        )
    )
    for row in stock_consumptions:
        bucket = metrics[row["material_id"]]
        bucket["total_consumed_quantity"] += row["total_quantity"] or ZERO
        bucket["total_consumed_estimated_cost"] += row["total_cost"] or ZERO
        movement_last = row["last_consumed_at"]
        if movement_last and (
            bucket["last_consumed_at"] is None
            or movement_last > bucket["last_consumed_at"]
        ):
            bucket["last_consumed_at"] = movement_last

    open_units = (
        MaterialOpenUnit.objects.filter(material_id__in=material_ids)
        .prefetch_related("consumptions")
        .only("id", "material_id", "status", "opened_at", "finished_at")
    )
    finished_jobs_by_material = {material_id: 0 for material_id in material_ids}
    finished_durations_by_material = {material_id: [] for material_id in material_ids}
    for unit in open_units:
        bucket = metrics[unit.material_id]
        if unit.status == MaterialOpenUnit.Status.OPEN:
            bucket["open_units_active_count"] += 1
            continue
        if unit.status != MaterialOpenUnit.Status.FINISHED:
            continue
        bucket["open_units_finished_count"] += 1
        finished_jobs_by_material[unit.material_id] += len(
            {consumption.work_order_id for consumption in unit.consumptions.all()}
        )
        if unit.duration_days is not None:
            finished_durations_by_material[unit.material_id].append(unit.duration_days)

    for material_id, bucket in metrics.items():
        finished_count = bucket["open_units_finished_count"]
        bucket["average_jobs_per_finished_unit"] = average_decimal(
            finished_jobs_by_material[material_id],
            finished_count,
        )
        durations = finished_durations_by_material[material_id]
        bucket["average_days_per_finished_unit"] = average_decimal(
            sum(durations),
            len(durations),
        )

    return metrics


def build_service_usage_rows(units):
    """Agrupa unidades historicas finalizadas por (material, servicio) y estima
    el consumo de producto por servicio: producto total consumido / trabajos
    cubiertos."""
    grouped = {}
    for unit in units:
        key = (unit.material_id, unit.service_id)
        bucket = grouped.get(key)
        if bucket is None:
            bucket = {
                "material": unit.material_id,
                "material_name": unit.material.name,
                "material_unit": unit.material.unit,
                "material_unit_cost": unit.material.estimated_unit_cost or ZERO,
                "service": unit.service_id,
                "service_name": unit.service.name,
                "units_count": 0,
                "total_jobs": 0,
                "total_quantity": ZERO,
                "total_days": 0,
            }
            grouped[key] = bucket
        bucket["units_count"] += 1
        bucket["total_jobs"] += len({consumption.work_order_id for consumption in unit.consumptions.all()})
        bucket["total_quantity"] += unit.stock_quantity_to_decrement or ZERO
        if unit.duration_days is not None:
            bucket["total_days"] += unit.duration_days

    rows = []
    for bucket in grouped.values():
        total_jobs = bucket["total_jobs"]
        units_count = bucket["units_count"]
        if total_jobs:
            consumption_per_service = bucket["total_quantity"] / Decimal(total_jobs)
            cost_per_service = (bucket["total_quantity"] * bucket["material_unit_cost"]) / Decimal(total_jobs)
        else:
            consumption_per_service = ZERO
            cost_per_service = ZERO
        rows.append(
            {
                "material": bucket["material"],
                "material_name": bucket["material_name"],
                "material_unit": bucket["material_unit"],
                "service": bucket["service"],
                "service_name": bucket["service_name"],
                "units_count": units_count,
                "total_jobs": total_jobs,
                "estimated_consumption_per_service": consumption_per_service,
                "estimated_cost_per_service": cost_per_service,
                "avg_jobs_per_unit": average_decimal(total_jobs, units_count),
                "avg_days_per_unit": average_decimal(bucket["total_days"], units_count),
            }
        )
    rows.sort(key=lambda row: (row["material_name"].lower(), row["service_name"].lower()))
    return rows


class MaterialViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [CanViewEconomy]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        metrics_map = getattr(self, "_material_list_metrics_map", None)
        if metrics_map is not None:
            context["material_list_metrics_map"] = metrics_map
        return context

    def get_queryset(self):
        queryset = self.queryset
        if self.request.query_params.get("include_inactive") != "1":
            queryset = queryset.filter(is_active=True)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(unit__icontains=search))
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        rows = page if page is not None else list(queryset)
        self._material_list_metrics_map = build_material_list_metrics(rows)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(rows, many=True)
        return response.Response(serializer.data)

    def perform_destroy(self, instance):
        instance.delete()

    @decorators.action(detail=False, methods=["get"], url_path="service-usage")
    def service_usage(self, request):
        """Consumo estimado por servicio, derivado de las unidades historicas
        (material x servicio). Alimenta la vista cruzada y el volcado a receta."""
        business = business_from_request(request)
        units = (
            MaterialOpenUnit.objects.filter(
                status=MaterialOpenUnit.Status.FINISHED,
                service__isnull=False,
            )
            .select_related("material", "service")
            .prefetch_related("consumptions")
        )
        if business is not None:
            units = units.filter(material__business=business)
        rows = build_service_usage_rows(units)
        serializer = ServiceUsageRowSerializer(rows, many=True)
        return response.Response({"results": serializer.data})


class ToolViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = Tool.objects.all()
    serializer_class = ToolSerializer
    permission_classes = [CanViewEconomy]

    def get_queryset(self):
        include_inactive = self.request.query_params.get("include_inactive") == "1"
        queryset = Tool.all_objects.all() if include_inactive else self.queryset
        if not include_inactive:
            queryset = queryset.filter(is_active=True)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(status__icontains=search)
                | Q(notes__icontains=search)
            )
        return queryset

    def perform_destroy(self, instance):
        instance.delete()


def supplier_list_insights_defaults():
    return {
        "purchase_count": 0,
        "total_purchased": Decimal("0.00"),
        "last_purchase_on": None,
        "pending_reception_count": 0,
        "materials_count": 0,
        "has_pending_reception": False,
    }


def build_supplier_list_insights(queryset):
    supplier_ids = list(queryset.values_list("id", flat=True))
    insights = {
        supplier_id: supplier_list_insights_defaults()
        for supplier_id in supplier_ids
    }
    if not supplier_ids:
        return insights

    rows = (
        StockMovement.objects.filter(
            supplier_id__in=supplier_ids,
            movement_type=StockMovement.MovementType.PURCHASE,
        )
        .values("supplier_id")
        .annotate(
            purchase_count=Count("id", distinct=True),
            total_purchased=Sum("total_amount"),
            last_purchase_on=Max("occurred_on"),
            pending_reception_count=Count(
                "id",
                filter=Q(products_received=False),
                distinct=True,
            ),
            materials_count=Count("lines__material", distinct=True),
        )
    )
    for row in rows:
        bucket = insights[row["supplier_id"]]
        bucket.update(
            {
                "purchase_count": row["purchase_count"] or 0,
                "total_purchased": row["total_purchased"] or Decimal("0.00"),
                "last_purchase_on": row["last_purchase_on"],
                "pending_reception_count": row["pending_reception_count"] or 0,
                "materials_count": row["materials_count"] or 0,
                "has_pending_reception": bool(row["pending_reception_count"]),
            }
        )
    return insights


def supplier_material_history_rows(movements):
    materials = {}
    for movement in movements:
        for line in movement.lines.all():
            bucket = materials.setdefault(
                line.material_id,
                {
                    "material": line.material_id,
                    "material_name": line.material.name,
                    "material_unit": line.material.unit,
                    "purchase_count": 0,
                    "total_quantity": Decimal("0.00"),
                    "total_purchased": Decimal("0.00"),
                    "last_purchase_on": None,
                    "last_unit_price": None,
                    "recent_unit_prices": [],
                },
            )
            bucket["purchase_count"] += 1
            bucket["total_quantity"] += line.quantity
            bucket["total_purchased"] += line.line_total
            if bucket["last_purchase_on"] is None:
                bucket["last_purchase_on"] = movement.occurred_on
                bucket["last_unit_price"] = line.unit_price
            if len(bucket["recent_unit_prices"]) < 5:
                bucket["recent_unit_prices"].append(
                    {
                        "movement": movement.id,
                        "occurred_on": movement.occurred_on,
                        "quantity": line.quantity,
                        "unit_price": line.unit_price,
                        "line_total": line.line_total,
                    }
                )

    return sorted(
        materials.values(),
        key=lambda item: (
            item["purchase_count"],
            item["last_purchase_on"] or date.min,
            item["total_purchased"],
        ),
        reverse=True,
    )


class SupplierViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [CanViewEconomy]

    def get_serializer_class(self):
        if self.action == "list":
            return SupplierListSerializer
        return super().get_serializer_class()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        insights_map = getattr(self, "_supplier_list_insights_map", None)
        if insights_map is not None:
            context["supplier_list_insights_map"] = insights_map
        return context

    def get_queryset(self):
        queryset = self.queryset
        if self.request.query_params.get("include_inactive") != "1":
            queryset = queryset.filter(is_active=True)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(legal_name__icontains=search)
                | Q(category__icontains=search)
                | Q(tax_condition__icontains=search)
                | Q(website__icontains=search)
                | Q(contact_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
                | Q(tax_id__icontains=search)
            )
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        self._supplier_list_insights_map = build_supplier_list_insights(queryset)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return response.Response(serializer.data)

    def perform_destroy(self, instance):
        instance.delete()

    @decorators.action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        supplier = self.get_object()
        purchases = list(
            StockMovement.objects.filter(
                supplier=supplier,
                movement_type=StockMovement.MovementType.PURCHASE,
            )
            .prefetch_related("lines__material")
            .order_by("-occurred_on", "-id")
        )
        purchase_ids = [purchase.id for purchase in purchases]
        cash_movements = list(
            CashMovement.objects.select_related("stock_movement", "created_by")
            .filter(stock_movement_id__in=purchase_ids)
            .order_by("-occurred_at", "-id")
        )
        debts = list(
            Debt.objects.select_related("supplier", "cash_movement")
            .prefetch_related("payments")
            .filter(supplier=supplier)
            .order_by("-origin_date", "-id")
        )

        serialized_purchases = StockMovementSerializer(
            purchases,
            many=True,
            context={"request": request},
        ).data
        documents = [
            {
                "id": purchase["id"],
                "occurred_on": purchase["occurred_on"],
                "document_type": purchase["document_type"],
                "document_type_label": purchase["document_type_label"],
                "document_number": purchase["document_number"],
                "document_file_url": purchase["document_file_url"],
                "total_amount": purchase["total_amount"],
            }
            for purchase in serialized_purchases
            if purchase["document_type"] or purchase["document_number"] or purchase["document_file_url"]
        ]
        pending_receipts = [
            purchase
            for purchase in serialized_purchases
            if purchase["products_received"] is False
        ]

        total_purchased = sum((movement.total_amount for movement in purchases), Decimal("0.00"))
        cash_expense_total = sum(
            (
                movement.amount
                for movement in cash_movements
                if movement.movement_type == CashMovement.MovementType.EXPENSE
            ),
            Decimal("0.00"),
        )
        debt_balance_due_total = sum((debt.balance_due for debt in debts), Decimal("0.00"))
        materials = supplier_material_history_rows(purchases)

        return response.Response(
            {
                "supplier": SupplierSerializer(supplier, context={"request": request}).data,
                "summary": {
                    "purchase_count": len(purchases),
                    "total_purchased": total_purchased,
                    "last_purchase_on": purchases[0].occurred_on if purchases else None,
                    "pending_reception_count": len(pending_receipts),
                    "materials_count": len(materials),
                    "cash_expense_total": cash_expense_total,
                    "debt_balance_due_total": debt_balance_due_total,
                },
                "purchases": serialized_purchases,
                "pending_receipts": pending_receipts,
                "materials": materials,
                "documents": documents,
                "cash_movements": CashMovementSerializer(
                    cash_movements,
                    many=True,
                    context={"request": request},
                ).data,
                "debts": DebtSerializer(
                    debts,
                    many=True,
                    context={"request": request},
                ).data,
            }
        )


class StockMovementViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("material_stock", "cash_movement", "material_cost")
    queryset = (
        StockMovement.objects.select_related("supplier", "customer", "reservation", "work_order")
        .prefetch_related("lines__material")
        .all()
    )
    serializer_class = StockMovementSerializer
    permission_classes = [CanViewEconomy]

    def get_queryset(self):
        queryset = self.queryset
        movement_type = self.request.query_params.get("movement_type")
        material = self.request.query_params.get("material")
        date_from = parse_date(self.request.query_params.get("from") or "")
        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)
        if material:
            queryset = queryset.filter(lines__material_id=material).distinct()
        if date_from:
            queryset = queryset.filter(occurred_on__gte=date_from)
        return queryset

    @transaction.atomic
    def perform_destroy(self, instance):
        if stock_movement_affects_cash(instance.movement_type, instance.affects_cash):
            ensure_cash_day_open(instance.occurred_on, field="occurred_on", business=instance.business)
        reverse_stock_movement_effects(instance)
        instance.delete()


class MaterialPurchaseViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("material_stock", "cash_movement", "material_cost")
    queryset = MaterialPurchase.objects.select_related("material").all()
    serializer_class = MaterialPurchaseSerializer
    permission_classes = [CanViewEconomy]

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.affects_cash and instance.total_cost > 0:
            ensure_cash_day_open(instance.purchased_at, field="purchased_at", business=instance.business)
        material = Material.objects.select_for_update().get(pk=instance.material_id)
        if material.stock_quantity < instance.quantity:
            raise serializers.ValidationError({"quantity": "No se puede eliminar: el stock quedaria negativo."})
        CashMovement.objects.filter(material_purchase=instance).delete()
        material.stock_quantity -= instance.quantity
        material.save(update_fields=["stock_quantity", "updated_at"])
        instance.delete()
        refresh_material_cost(material)


class MaterialOpenUnitViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = (
        MaterialOpenUnit.objects.select_related("material", "opened_by_work_order")
        .prefetch_related("consumptions__work_order")
        .all()
    )
    serializer_class = MaterialOpenUnitSerializer
    permission_classes = [CanViewEconomy]

    def get_queryset(self):
        queryset = self.queryset
        material = self.request.query_params.get("material")
        status_filter = self.request.query_params.get("status")
        if material:
            queryset = queryset.filter(material_id=material)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    @decorators.action(detail=False, methods=["post"], url_path="register-usage")
    @transaction.atomic
    def register_usage(self, request):
        """Registro retroactivo: crea una unidad historica (finalizada) y un uso
        por cada reserva pasada del servicio. No descuenta stock actual."""
        serializer = MaterialUsageBackfillSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        open_unit = serializer.save()
        record_audit_event(
            request=request,
            action="register_usage",
            instance=open_unit,
            before=None,
            after=audit_snapshot(open_unit),
            metadata={
                "material": open_unit.material_id,
                "service": open_unit.service_id,
                "reservations": [reservation.id for reservation in serializer.validated_data["reservations"]],
            },
        )
        return response.Response(
            self.get_serializer(open_unit).data,
            status=status.HTTP_201_CREATED,
        )

    @decorators.action(detail=True, methods=["post"])
    def consume(self, request, pk=None):
        open_unit = self.get_object()
        serializer = MaterialConsumptionSerializer(
            data={
                **request.data,
                "material": open_unit.material_id,
                "open_unit": open_unit.id,
                "quantity": "0.00",
            },
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        consumption = serializer.save(business=open_unit.business)
        record_audit_event(
            request=request,
            action="consume",
            instance=consumption,
            before=None,
            after=audit_snapshot(consumption),
            metadata={"open_unit": open_unit.id},
        )
        return response.Response(
            MaterialConsumptionSerializer(consumption, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @decorators.action(detail=True, methods=["post"])
    @transaction.atomic
    def finish(self, request, pk=None):
        open_unit = MaterialOpenUnit.objects.select_for_update().select_related("material").get(pk=self.get_object().pk)
        before = audit_snapshot(open_unit)
        if open_unit.status != MaterialOpenUnit.Status.OPEN:
            raise serializers.ValidationError({"status": "La unidad abierta ya fue finalizada."})

        finished_at = request.data.get("finished_at") or timezone.localdate()
        if isinstance(finished_at, str):
            finished_at = parse_date(finished_at)
        if not finished_at:
            raise serializers.ValidationError({"finished_at": "Fecha invalida."})
        if finished_at < open_unit.opened_at:
            raise serializers.ValidationError({"finished_at": "La fecha de cierre no puede ser anterior a la apertura."})

        material = Material.objects.select_for_update().get(pk=open_unit.material_id)
        if material.stock_quantity < open_unit.stock_quantity_to_decrement:
            raise serializers.ValidationError({"material": "Stock insuficiente para finalizar la unidad."})
        material.stock_quantity -= open_unit.stock_quantity_to_decrement
        material.save(update_fields=["stock_quantity", "updated_at"])

        open_unit.status = MaterialOpenUnit.Status.FINISHED
        open_unit.finished_at = finished_at
        open_unit.save(update_fields=["status", "finished_at"])
        record_audit_event(
            request=request,
            action="finish",
            instance=open_unit,
            before=before,
            after=audit_snapshot(open_unit),
            metadata={"material": material.id},
        )
        return response.Response(self.get_serializer(open_unit).data)


class MaterialConsumptionViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("material_stock",)
    queryset = MaterialConsumption.objects.select_related("material", "open_unit", "work_order").all()
    serializer_class = MaterialConsumptionSerializer
    permission_classes = [CanViewEconomy]

    @transaction.atomic
    def perform_destroy(self, instance):
        if not instance.open_unit_id:
            material = Material.objects.select_for_update().get(pk=instance.material_id)
            material.stock_quantity += instance.quantity
            material.save(update_fields=["stock_quantity", "updated_at"])
        instance.delete()
