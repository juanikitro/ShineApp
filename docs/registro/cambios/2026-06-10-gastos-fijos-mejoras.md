# Gastos fijos: edicion, revertir pago y correctitud de caja cerrada (2026-06-10)

Endurecimiento del modulo Gastos fijos (`2026-06-10-gastos-fijos.md`) tras
revision de edge cases.

## Caja cerrada (fix de correctitud)

El egreso de una ocurrencia debe quedar en un dia de caja ABIERTO. Si el periodo
cae en un dia cerrado, el `CashMovement` se postea al dia actual
(`occurred_at = hoy`) marcando `adjusts_closed_day = periodo`. Antes quedaba con
`occurred_at` en el dia cerrado, lo que divergia del `CashClosure` congelado y de
la atribucion por periodo del dashboard. Convencion alineada con el serializer de
caja (`ensure_cash_day_open` / `ensure_adjustment_target_closed`).

## Editar plantilla

`PATCH /api/fixed-expenses/{id}/` propaga monto / categoria / subcategoria /
vencimiento a las ocurrencias PENDIENTES (`sync_pending_occurrences`); las pagadas
quedan intactas (son egresos saldados). Frontend: el click en la plantilla abre el
`FixedExpenseForm` en modo edicion (PATCH); el titulo del modal cambia a "Editar
gasto fijo".

## Revertir pago (unpay)

`POST /api/fixed-expense-occurrences/{id}/unpay/` borra el `CashMovement` y vuelve
la ocurrencia a pendiente. Bloquea con 400 si el dia del movimiento ya esta
cerrado (hay que reabrir la caja primero). `pay`/`unpay` usan `select_for_update`.
Frontend: boton "Revertir" (con confirmacion) en los pagos recientes.

## Eliminar plantilla

Al eliminar (soft-delete) una plantilla, sus ocurrencias PENDIENTES se borran (ya
no se adeudan); las pagadas quedan como egresos historicos.

## Panel

Metrica "Estimado mensual" (equivalente mensual de las plantillas activas) en
lugar del "Pagado" historico; badge "Vencido" en pendientes con vencimiento
pasado.

## Tests

`tests/test_fixed_expenses.py`: dia cerrado -> ajuste posteado a dia abierto +
atribucion al periodo de liquidacion (no al cerrado); unpay (ok + bloqueado por
dia cerrado); propagacion de edicion a pendientes (y no a pagadas); eliminar borra
pendientes y conserva pagadas.
