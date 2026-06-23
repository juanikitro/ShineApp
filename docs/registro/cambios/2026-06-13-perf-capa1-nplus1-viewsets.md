# Performance Capa 1: N+1 en viewsets (catalog, finance, customers, inventory)

## Contexto

Auditoria de performance (2026-06-12/13). Varios viewsets serializaban relaciones
sin select_related/prefetch o computaban metricas por fila, generando N+1.

## Cambio

- `catalog/views.py` `ServiceViewSet`: `queryset` ahora hace
  `prefetch_related("materials__material")`. ServiceSerializer anida
  ServiceMaterialSerializer (lee material.name/unit/estimated_unit_cost), antes N+1
  por servicio.
- `finance/views.py`: se extrae `CASH_MOVEMENT_SELECT_RELATED` (select_related
  profundo que cubre los FKs de los method-fields de CashMovementSerializer:
  payment.work_order.customer, stock_movement.supplier/customer,
  material_purchase.material, debt.supplier, created_by). Se aplica en
  `cash_entries_for_day`, `CashMovementViewSet.queryset` y `CashDailyView.movements`
  (estos dos ultimos tenian select_related shallow -> N+1 por movimiento).
- `customers/views.py`:
  - `CustomerViewSet.list`: `build_customer_list_insights` ahora corre sobre la
    pagina paginada, no sobre toda la cartera. Las metricas son por-cliente, asi que
    el resultado por fila es identico; antes computaba insights para todos los
    clientes del negocio aunque se mostraran 100.
  - `VehicleViewSet.history`: `select_related("service","reservation")` (cubre
    order.service.name y order.status que lee reservation) y
    `build_work_order_financial_metrics` batcheado para paid_amount/balance_due,
    en vez de 2 aggregates por orden.
- `inventory/serializers.py` `MaterialOpenUnitSerializer`: `work_orders_count` y
  `consumptions_count` pasan de IntegerField (que leian properties con 1 query c/u)
  a SerializerMethodField que cuentan desde el prefetch `consumptions__work_order`
  del viewset; `get_consumptions` reusa ese prefetch (ordena en Python) en vez de
  re-consultar con `.order_by()`. Fallback a la property/query cuando no hay prefetch
  (objeto suelto).

Sin cambios de contrato: el JSON expuesto es identico.

## Impacto esperado

- Listados de servicios, movimientos de caja, caja diaria, clientes y unidades
  abiertas pasan de O(filas x relaciones) a un numero constante de queries. TTFB de
  esos endpoints y de los data-loads que los consumen.

## Archivos modificados

- `backend/catalog/views.py`
- `backend/finance/views.py`
- `backend/customers/views.py`
- `backend/inventory/serializers.py`

## Validacion

- `py -3 -m pytest tests/test_finance_categories_payments.py tests/test_stock_movements.py
  tests/test_tool_inventory.py tests/test_mvp_flows.py tests/test_multitenancy.py
  tests/test_sectors.py tests/test_workorders.py tests/test_suppliers.py
  tests/test_dashboard_series.py`: 132 passed.
