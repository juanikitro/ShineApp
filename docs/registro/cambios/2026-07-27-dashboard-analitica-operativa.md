# Dashboard: analitica operativa y comercial

## Cambio funcional

El dashboard conserva su vista `Resumen` y agrega la vista `Analisis`, enfocada en
comparar el periodo sin ocultar la operacion existente. El selector `Resumen /
Analisis` vive en el toolbar de periodo, alineado con `Desde` y `Hasta`, para que el
rango y el modo se lean como una sola consulta. La nueva lectura muestra:

- pulso de facturacion y caja real contra el periodo anterior;
- columnas de facturacion actual frente al periodo anterior y composicion facturada
  por servicio;
- ticket promedio actual/anterior, calculado como facturado sobre ordenes operativas;
- cinta de operacion que conecta cotizaciones, reservas, entregas y cobros sin
  mezclar sus unidades;
- embudo comercial por cotizacion;
- comparacion de facturacion y margen estimado proporcional por servicio;
- recurrencia de clientes con trabajo operativo previo;
- evolucion semanal apilada de ordenes ingresadas con su estado actual;
- caja, antiguedad por cobrar y lecturas derivadas explicitamente limitadas por los
  datos disponibles.

No se agregan dependencias, modelos ni migraciones. La vista `Resumen` mantiene sus
KPIs, alertas, cobranzas, rankings y acciones tal como estaban. `Siguiente accion` y
las tareas inmediatas no se renderizan en `Analisis`: esa vista es solo de lectura
analitica.

## Contrato API

Para usuarios con permiso de economia, `GET /api/dashboard/summary/` agrega el objeto
aditivo `analytics`:

- `previous_series`: serie equivalente del periodo anterior para comparar el pulso.
- `service_comparison`: todos los servicios presentes en el periodo actual o previo,
  con facturacion, cobranzas, saldo, margen estimado, cantidad de ordenes y variacion
  de tasa de margen en puntos porcentuales. Una tasa sin facturacion queda en `null`;
  no se presenta como cero comparable.
- `commercial_funnel`: cotizaciones filtradas por `quote_date`. La unidad es siempre
  `quote`; una cotizacion grupal cuenta una vez. Una cotizacion esta reservada solo si
  todas sus lineas tienen reserva, entregada si todas esas reservas estan entregadas y
  cobrada si todas sus ordenes vinculadas no tienen saldo.
- `customer_recurrence`: clientes con orden operativa en el periodo, separados entre
  recurrentes (al menos una orden operativa previa a `from`) y nuevos.
- `weekly_workload`: ordenes creadas en el periodo, agrupadas por semanas ancladas en
  `from`, con un snapshot de su estado actual. No es una serie historica de entregas.
- `previous_period.average_ticket`: ticket promedio del periodo equivalente anterior,
  calculado con su facturacion y cantidad de ordenes operativas. Es aditivo y puede
  ser `0` cuando el periodo anterior no tiene ordenes.

Los filtros de ordenes reutilizan los estados operativos ya usados por el resumen
(`in_progress`, `ready`, `delivered`). El payload sigue ausente para usuarios sin
economia, igual que los demas datos economicos del dashboard.

## Limites visibles

El analisis no inventa rentabilidad por tecnico, metas de negocio ni cohortes de
entrega: el modelo actual no registra esas relaciones o eventos. La interfaz lo deja
explicito para evitar que una visualizacion se interprete como un hecho no disponible.

## Validacion

- `py -3 -m pytest backend/tests/test_dashboard_analytics.py -q`
- `npm exec -- vitest run --maxWorkers=1 app/components/dashboard/DashboardPeriodToolbar.test.tsx app/components/layout/WorkspaceHeaderContent.test.tsx app/components/dashboard/DashboardPanel.test.tsx app/components/dashboard/DashboardAnalyticsPanel.test.tsx`
- `npm exec -- tsc --noEmit --pretty false`
