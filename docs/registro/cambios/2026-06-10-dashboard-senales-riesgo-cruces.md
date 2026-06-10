# Dashboard: senales de riesgo de cobranza/caja + lecturas cruzadas

## Cambio funcional

Rediseno de la capa visual del dashboard: deja de ser tendencia decorativa y pasa a
marcar riesgo de cobranza y de caja, y suma lecturas cruzadas. Reemplaza el sparkline
de tendencia generico que no aportaba lectura accionable en un dashboard operativo.

- **KPIs base**: "Caja real" muestra un sparkline cero-aware (linea base en 0; tramos
  negativos en rojo = semanas en rojo). "Por cobrar" muestra un medidor de antiguedad
  por riesgo (fresco neutro -> +31 dias en rojo). Facturado, Margen y Cobrado quedan
  sin grafico (numero + delta).
- **Delta con valor anterior**: el hint ahora incluye el valor del periodo anterior
  entre parentesis, p.ej. "+19,1% vs periodo anterior ($2.375.000)".
- **Nuevo panel "Lecturas cruzadas"**: 8 ratios que cruzan dos datos (cobranza del
  periodo, ticket promedio, margen sobre facturado, dias promedio de cobranza, posicion
  neta, mayor egreso, ingreso top por categoria, carga de egresos).
- **Nuevo panel "Caja por categoria"**: desglose de ingresos y egresos por categoria,
  con barra de proporcion.
- **Antiguedad por cobrar**: barras graduadas por riesgo (fresco neutro -> vencido rojo).
- **Rankings**: arreglo de desborde (nombres largos ya no se salen de la columna).

## Contrato API

- `GET /api/dashboard/summary/` agrega `cash_by_category` (solo economia):
  `income_by_category` y `expense_by_category`. Agrega `CashMovement` por categoria con
  los mismos filtros que el cashflow (movimientos con efecto + pagos de deuda como
  "Pago de deudas"), de modo que cada lado suma exactamente su total de caja. Invariante
  testeado en `backend/tests/test_dashboard_series.py`.
- `series` (ya existente) ahora se consume solo para el sparkline de Caja real.

## Compatibilidad

- Backend aditivo: `cash_by_category` es clave nueva; sin cambios de modelo ni migraciones.
- Frontend: las lecturas cruzadas y la mayoria de las senales se computan desde datos del
  payload ya existentes (cobrado, facturado, margen, deudas, antiguedad, ticket); solo el
  desglose por categoria depende del agregado nuevo.
- Se elimina el componente `Sparkline` generico, reemplazado por `CajaSparkline`
  (cero-aware) y `RiskMeter` (medidor de antiguedad).
