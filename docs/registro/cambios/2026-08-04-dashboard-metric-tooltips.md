# Dashboard: ayuda accesible para métricas del resumen

## Cambio visible

Las nueve tarjetas informativas del resumen de Dashboard muestran una ayuda
contextual con hover y foco de teclado. Reutilizan el tooltip global de la
aplicación y exponen el mismo texto a tecnologías asistivas mediante
`aria-describedby`; no cambian cálculos, filtros, permisos ni el payload de
`GET /api/dashboard/summary/`.

## Semántica explicada

| Métrica | Lectura mostrada en la ayuda |
| --- | --- |
| Facturado | Total de las órdenes operativas creadas en el rango, solo con reservas en proceso, listas o entregadas. |
| Margen estimado | Facturado menos el costo estimado de materiales consumidos en el mismo rango; no descuenta compras, gastos fijos ni otros movimientos de caja. |
| Caja real | Ingresos menos egresos de movimientos de caja del rango, incluidos pagos de deudas; excluye el movimiento de origen de una deuda para no duplicarlo. |
| Por cobrar | Saldo de las órdenes operativas creadas en el rango, después de todos sus pagos vinculados. |
| Cobrado | Pagos cuya fecha de pago cae en el rango; no depende de la fecha ni del estado de la orden. |
| Materiales consumidos | Costo estimado de consumos y movimientos de stock de tipo Consumo del rango; no incluye compras ni stock inicial. |
| Compras de materiales | Compras y movimientos de stock de tipo Compra del rango; no incluye consumos, ventas ni stock inicial. |
| Deudas vencidas | Saldo actual de deudas con vencimiento anterior a hoy, menos sus pagos; no depende del rango e ignora las saldadas. |
| Gastos fijos por pagar | Ocurrencias pendientes según la fecha de período seleccionada; excluye pagadas y otros períodos. |

La semántica de cada importe sigue siendo responsabilidad del backend de
Dashboard. La ayuda solo hace visible esa lectura existente y no convierte las
métricas en reglas de negocio del frontend.

## Validación

- Pruebas focalizadas de `DashboardPanel` y `MetricCard` para texto, foco y
  accesibilidad.
- Revisión de que el tooltip global no oculte tarjetas ni altere el layout.
