# Performance Capa 1: dashboard (periodo previo scalar-only + today aggregate)

## Contexto

Auditoria de performance (2026-06-12/13). `DashboardSummaryView.get` corria
`dashboard_period_summary` para el periodo actual y el previo con la misma
maquinaria completa, pero del periodo previo solo se usan 6 escalares
(comparacion, insights, has_activity). Ademas los totales de hoy se calculaban con
dos aggregates separados.

## Cambio

- `dashboard/views.py` `dashboard_period_summary(..., with_rankings=True)`: con
  `with_rankings=False` (periodo previo) saltea `material_cost_rankings_for_period`
  y `fixed_expenses_pending_for_period` (2 queries + CPU que nadie lee para ese
  periodo) y devuelve `rankings={}` + defaults de fixed_pending. Se verificaron las
  claves que consumen `comparison_for`, `economic_insights_for`,
  `dashboard_summary_has_activity` y el dict `previous_period`: todas escalares y
  presentes (billed_total, collected_total, balance_due_total, material_cost_total,
  material_purchases_total, estimated_margin_total, cashflow_*). Sin cambio de
  contrato en la respuesta.
- `DashboardSummaryView.get`: el periodo previo se pide con `with_rankings=False`;
  los totales de hoy se calculan con un unico aggregate condicional
  (`Sum(filter=Q(...))`) en lugar de dos queries.

## No incluido (deliberado)

- `dashboard_period_series` (bucketing por dia en Python) NO se migro a
  `TruncDate().annotate(Sum)`. Riesgo alto sin red de tests: el bucketing usa
  `series_local_day` (conversion timezone-aware) y `cash_movement_cashflow_effect`
  (predicado de negocio en Python para CashMovement), que no se replican triviales
  en SQL. Los indices compuestos de la capa 1 ya aceleran esas queries. Queda como
  follow-up con un plan de validacion de paridad timezone/predicado.

## Impacto esperado

- Menos queries y CPU por carga de dashboard (se evita la maquinaria de rankings y
  el detalle de gastos fijos del periodo previo, y un aggregate de hoy). TTFB del
  endpoint que pega en cada login y cambio de periodo.

## Archivos modificados

- `backend/dashboard/views.py`

## Validacion

- `py -3 -m pytest tests/test_dashboard_series.py tests/test_mvp_flows.py`: 84 passed.
