# Gastos fijos: proyeccion de pendientes en dashboard y dialogo de pago (2026-06-10)

Segunda ronda de mejoras sobre el modulo Gastos fijos.

## Proyeccion de pendientes en el dashboard

`GET /api/dashboard/summary/` ahora incluye dos campos adicionales:

- `fixed_expenses_pending_total`: suma de montos de ocurrencias pendientes cuyo
  `period_date` cae dentro del rango solicitado (`from`/`to`).
- `fixed_expenses_pending_count`: cantidad de esas ocurrencias.

Estos valores NO se suman a `cashflow_expense_total` (caja real = pagado). Son
una proyeccion informativa separada. El panel de Dashboard los muestra como
"Gastos fijos por pagar" en la seccion "Composicion economica".

## Dialogo de pago al registrar una ocurrencia

Antes de esta mejora, el boton "Registrar pago" ejecutaba el pago con el metodo
de la plantilla sin confirmacion. Ahora abre un dialogo que permite elegir:

- **Metodo de pago**: efectivo / tarjeta / transferencia / otro.
- **Fecha de pago**: por defecto el dia actual.

El payload resultante incluye `{ method, paid_at }` en el POST a
`/api/fixed-expense-occurrences/{id}/pay/` (el endpoint ya lo soportaba desde
el inicio). El dialogo se cancela sin side effects; la logica de caja cerrada
y ajuste permanece igual.

## Tests

`tests/test_fixed_expenses.py`: `test_dashboard_pending_fixed_expenses_projection`
verifica que `fixed_expenses_pending_total` refleja el monto de la ocurrencia
pendiente y que `cashflow_expense_total` permanece en cero para esa misma
ocurrencia.
