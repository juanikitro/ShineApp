# Modulo Gastos fijos (2026-06-10)

**Objetivo:** cargar gastos recurrentes (servicios wifi/luz/gas/agua, alquiler,
expensas) que se reflejan como egresos reales en la caja, periodo a periodo
(mensual, quincenal o semanal segun cada gasto). Reemplaza a las deudas
recurrentes (`2026-06-10-revert-deudas-recurrentes.md`).

## Modelo (`backend/fixed_expenses/`)

- `FixedExpense` (plantilla, `SoftDeleteMixin`): `concept`, `supplier?`,
  `amount`, `expense_category/subcategory`, `notes`, `interval_unit`
  (`weeks`/`months`) + `interval_count`, `start_date`, `due_offset_days`,
  `end_date?`, `max_cycles?`, `is_active`, `auto_pay`, `payment_method`,
  sentinelas `cycles_generated`/`last_generated_for`.
- `FixedExpenseOccurrence` (ocurrencia por periodo): `fixed_expense`,
  `period_date`, `due_date?`, `amount`/`expense_category`/`expense_subcategory`
  (snapshots), `status` (`pending`/`paid`), `cash_movement` O2O a
  `finance.CashMovement`, `method`, `paid_at?`. `UniqueConstraint(fixed_expense,
  period_date)` con `condition=deleted_at IS NULL` (idempotencia compatible con
  soft-delete).
- Periodicidad: semanal = `weeks/1`, quincenal = `weeks/2`, mensual = `months/1`.

## Materializacion (`materialization.py`)

`materialize_due(business, today, user)` genera, por plantilla activa, las
ocurrencias faltantes hasta hoy (idempotente: `select_for_update` +
`last_generated_for`/`cycles_generated`). Por cada periodo:
- `auto_pay=True`: crea el `CashMovement` real de egreso (`occurred_at` = fecha
  del periodo) y marca la ocurrencia `paid`. Si el dia de caja esta cerrado, el
  movimiento usa `adjusts_closed_day` (cuenta como ajuste en cashflow) en vez de
  saltarse.
- `auto_pay=False`: ocurrencia `pending`, sin movimiento.

`register_occurrence_payment(occurrence, user, method, paid_at)` registra el pago
manual de una ocurrencia pendiente (idempotente). Reusa el patron de
`debts.serializers.sync_debt_cash_movement` + `core.register_expense_classification`.

## Endpoints (`CanViewEconomy` + scope por business)

- `GET/POST /api/fixed-expenses/`, `GET/PATCH/PUT/DELETE /api/fixed-expenses/{id}/`
  (el GET de la lista dispara `materialize_due`). DELETE = soft-delete de la
  plantilla (conserva ocurrencias).
- `POST /api/fixed-expenses/{id}/pause/` y `.../resume/`.
- `GET /api/fixed-expense-occurrences/` (filtros `?status=`, `?fixed_expense=`;
  tambien dispara `materialize_due`), `GET .../{id}/`.
- `POST /api/fixed-expense-occurrences/{id}/pay/` (body opcional
  `{method, paid_at}`).

## Reflejo en costos

Las ocurrencias pagadas crean un `CashMovement` expense (source `manual`, o
`adjustment` si el dia estaba cerrado), por lo que entran solas en
`cashflow_expense_total` del `/api/dashboard/summary/` y en la serie del periodo.
Las pendientes no afectan la caja real; se ven en el panel como "Por pagar del
periodo". Sin cambios en `dashboard/`.

## Frontend

Seccion `fixed-expenses` (label "Gastos fijos") en el grupo de economia, junto a
Deudas. `app/components/fixed-expenses/FixedExpensePanel.tsx` (metricas,
"Por pagar del periodo", plantillas con pausar/reanudar/eliminar, historial de
pagos) y `app/components/forms/FixedExpenseForm.tsx` (concepto, proveedor, monto,
categoria/subcategoria, periodicidad, auto-pago + metodo). Datasets
`fixedExpenses` y `fixedExpenseOccurrences` en `data-loading.ts`/`app-data.ts`.

## Tests

- Backend `tests/test_fixed_expenses.py`: materializacion semanal/quincenal/
  mensual, idempotencia, auto_pay on/off, endpoint pay, dia cerrado ->
  `adjusts_closed_day`, `end_date`/`max_cycles`, pause/resume, validaciones,
  contrato dashboard (`cashflow_expense_total` incluye el pago).
- Frontend `lib/fixed-expense-form.test.mjs` + `lib/app-data.test.mjs`.

## Decision relacionada

`docs/registro/decisiones/2026-06-10-gastos-fijos-egresos-reales.md`.
