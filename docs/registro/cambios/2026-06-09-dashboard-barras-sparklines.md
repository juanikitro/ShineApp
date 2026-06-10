# Dashboard: barras de proporcion y sparklines

## Cambio funcional

- Las filas del dashboard que mostraban solo numeros ahora codifican magnitud con una barra de proporcion de 3px al pie: antiguedad por cobrar, "trabajo por estado" y los cuatro rankings economicos (clientes/servicios por facturacion, trabajos por margen, materiales por costo). Cada barra es relativa al lider de su grupo; margen negativo o valor cero quedan en 0 (solo track, sin relleno).
- Los KPIs ejecutivos de flujo (Facturado, Margen estimado, Caja real) y "Cobrado" muestran un sparkline de tendencia del periodo. "Por cobrar" no lleva sparkline: es un saldo puntual (stock), no un flujo.
- Sin dependencias nuevas: las barras son CSS (gradiente track+fill via la variable `--share` en `.dashboard-sharebar`) y el sparkline es un `<svg><polyline>` propio (`frontend/app/components/ui/Sparkline.tsx`). Colores contenidos por tokens (`--dashboard-bar-fill` azul al 22 %, `--dashboard-spark-stroke` = acento); ambos temas (claro y dark navy) resueltos por token, radio sobrio 2px sin pills.

## Contrato API

- `GET /api/dashboard/summary/` agrega `series` al payload, solo para usuarios con economia (junto a `comparison`/`rankings`; ausente para empleados sin economia).
- Forma: `series = { interval: "day" | "week", from, to, points: [{ date, billed_total, collected_total, estimated_margin_total, cashflow_balance }] }`. Un punto por dia si el rango es <= 62 dias; si no, buckets semanales.
- Solo metricas de flujo. `estimated_margin_total` y `cashflow_balance` se derivan por dia. El saldo por cobrar (stock puntual) queda afuera a proposito.
- Invariante garantizado y testeado: `sum(points[m]) == summary[m]` para cada metrica de flujo, porque `dashboard_period_series` reusa las mismas filas y filtros que `dashboard_period_summary` bucketeadas por dia local (`backend/tests/test_dashboard_series.py`).

## Compatibilidad

- Aditivo: `series` es una clave nueva. El frontend ignora su ausencia; si falta, los KPIs no dibujan sparkline. Sin cambios de modelo ni migraciones.
- Las barras de proporcion no agregan datos: se calculan en frontend desde valores ya presentes en el payload.
