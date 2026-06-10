# Gastos fijos: egresos reales con auto-pago

Fecha: 2026-06-10

## Decision

El modulo Gastos fijos materializa egresos REALES en la caja (un `CashMovement`
de tipo expense por periodo), no una proyeccion. Cada plantilla tiene un booleano
`auto_pay`:

- `auto_pay=True`: el egreso se registra solo al vencer el periodo; la ocurrencia
  queda `paid` con su `CashMovement`.
- `auto_pay=False`: la ocurrencia queda `pending` ("por pagar del periodo") hasta
  que el usuario registra el pago, que recien ahi crea el `CashMovement`.

Las ocurrencias pendientes NO se suman a `cashflow_expense_total`: se preserva la
semantica "caja real = pagado". Su visibilidad se cumple en el panel.

## Contexto

Reemplaza a las deudas recurrentes (revertidas el 2026-06-10). Cruza con
`2026-05-07-deudas-contrato-economico.md`: igual que las deudas, el egreso se
cuenta una sola vez por su `CashMovement`; a diferencia de las deudas, aca no hay
pagos parciales (una ocurrencia = un egreso).

## Dia de caja cerrado

Si el periodo cae en un dia ya cerrado, el egreso se registra con
`adjusts_closed_day` (ajuste, que igual cuenta en cashflow) en lugar de saltarse.
Evita la complejidad de "skipped/banner" de la feature recurrente revertida.

## Trade-off

Los gastos sin auto-pago no impactan la caja hasta pagarse; el panel los muestra
como pendientes del periodo para que sigan visibles aunque no esten en el
cashflow. Una proyeccion ejecutiva de pendientes (separada del cashflow) queda
como mejora futura.
