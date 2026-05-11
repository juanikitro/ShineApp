# Clientes: historial economico y cumpleanos

Fecha: 2026-05-07

## Cambio funcional

- El cliente guarda cumpleanos como dia y mes mediante `birthday_day` y `birthday_month`.
- La API expone datos derivados de cumpleanos: `birthday_label`, `next_birthday`, `days_until_birthday` y `has_birthday_alert`.
- `GET /api/customers/birthdays/?days=3` devuelve clientes activos con cumpleanos entre hoy y los proximos 3 dias.
- `GET /api/customers/{id}/history/` devuelve resumen economico, vehiculos, ranking de servicios, ranking de vehiculos, ranking de marcas, trabajos, historial plano de pagos y consumos de materiales del cliente.

## Contrato economico

- El dinero ganado se representa con importes facturados y cobrados de trabajos del cliente.
- El dinero gastado se representa solo como costo estimado de materiales consumidos en trabajos del cliente.
- El margen del historial de clientes se calcula como facturado menos costo estimado de materiales.
- No se imputan egresos generales de caja al cliente porque `CashMovement` no tiene relacion con cliente.

## Permisos

- El historial economico del cliente requiere rol `empleador`.
- Cumpleanos y avisos de cumpleanos son visibles para usuarios autenticados.
- `Dashboard` queda visible para todos: empleados ven avisos de cumpleanos, pero no metricas economicas.

## UI

- El alta y edicion de cliente permiten cargar dia y mes de cumpleanos.
- El listado y detalle de clientes muestran el proximo cumpleanos cuando existe.
- El detalle de cliente carga historial economico solo para usuarios con `can_view_economy`.
- En el listado de clientes, el click sobre un cliente abre un dashboard especifico del cliente para usuarios `empleador`.
- El dashboard de cliente muestra datos del cliente, ventas, metricas economicas, rankings por servicio/vehiculo/marca e historial de pagos.
- Si el historial economico no carga, el dashboard no muestra ceros ni rankings vacios como si fueran datos reales.
- Para usuarios sin `can_view_economy`, el click conserva el detalle basico del cliente sin exponer ventas ni pagos.
