# Dashboard: señales operativas accionables

## Cambio funcional

La vista `Análisis operativo` amplía la analítica existente sin modificar la vista
`Resumen`. Las nuevas lecturas responden a decisiones inmediatas:

- capacidad de agenda por sector y día con reservas operativas, priorizando jornadas
  sin cupos, con un único cupo o sin capacidad configurada;
- tasas explícitas entre las etapas existentes del embudo comercial y su mayor caída
  cuando el período tiene al menos cinco cotizaciones;
- clientes nuevos frente a recurrentes y concentración de la facturación en los tres
  principales clientes, además de la composición por servicios ya disponible;
- relación descriptiva entre cobros y facturación, exposición vencida y próxima, y
  presión visible entre flujo de caja, cuentas por cobrar y compromisos.

Se reutilizan `Panel`, `MetricCard`, `RecordCard`, `RiskMeter` y las barras
proporcionales existentes. No se agregan modelos, campos, migraciones, dependencias ni
endpoints.

## Contrato API

`GET /api/dashboard/summary/` mantiene su contrato y agrega
`analytics.capacity_occupancy` únicamente dentro del bloque económico existente:

- `unit`: siempre `reservation`;
- `from` y `to`: período consultado;
- `sectors_count`: sectores activos del negocio;
- `active_statuses`: estados retornados por `Reservation.active_statuses()`;
- `sector_days`: jornadas con al menos una reserva operativa, agrupadas por
  `date` y `sector_id`, con `used_slots`, `capacity`, `available_slots` y
  `occupancy_rate`.

La capacidad se obtiene mediante `Reservation.capacity_for_day(...)`. Las reservas
canceladas no ocupan cupo. El cálculo usa el negocio de la solicitud y el mismo
período del resumen. Si no hay sectores activos o reservas operativas, la interfaz
muestra un estado vacío; no construye una grilla de ceros. Una capacidad no
configurada produce `occupancy_rate: null`.

El bloque `analytics` completo sigue ausente para usuarios sin `can_view_economy`, por
lo que estas lecturas no amplían la exposición de datos económicos.

## Bases y semántica

- El embudo conserva unidad `quote` y base temporal `quote_date` dentro del período.
  Las tasas son: aceptadas/cotizaciones, con reserva/aceptadas,
  entregadas/con reserva y cobradas sin saldo/entregadas. La mayor caída es una
  comparación descriptiva entre etapas, no una atribución causal.
- La recurrencia usa el contrato existente: un cliente es recurrente si tiene trabajo
  operativo previo a `from`. No representa retención de cohorte.
- La concentración de clientes divide la facturación de cada cliente principal por
  `billed_total`; la concentración por servicio conserva la comparación existente.
- `billed_total` sigue la fecha operativa de las órdenes y `collected_total` la fecha
  de los pagos. Su relación es descriptiva y no una eficiencia exacta de cobranza.
- La presión de caja cruza el flujo neto del período, el saldo por cobrar del período,
  las deudas vencidas y próximas a la fecha `debt_timing.as_of`, y los gastos fijos
  pendientes del período. No supone que las cuentas a cobrar ingresarán a tiempo.

La interfaz considera riesgo de saturación a una jornada sin cupos y advertencia a
una jornada con un único cupo. Esa prioridad es visual; no modifica las reglas de
agenda.

## Límites visibles

No se infieren rentabilidad final, productividad por técnico, no-show, tiempos reales
de ciclo, canal u origen comercial, forecast predictivo ni cohortes históricas. Esas
lecturas requieren datos o historial que el modelo actual no registra.

## Validación focalizada

- Desde `backend/`: `.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_analytics.py -q`
- Desde `frontend/`: `npm exec -- vitest run app/components/dashboard/DashboardAnalyticsPanel.test.tsx --maxWorkers=1`

No se ejecutan suites completas, build ni cobertura global.
