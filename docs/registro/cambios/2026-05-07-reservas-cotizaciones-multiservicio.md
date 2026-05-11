# Reservas y cotizaciones multiservicio

## Cambio funcional

- Las reservas aceptan varios servicios mediante `items`, con la misma forma operativa que las cotizaciones: `service`, `description`, `quantity`, `unit_price` y `line_total`.
- El campo historico `service` de la reserva sigue existiendo y queda sincronizado con el primer item para mantener compatibilidad con agenda, ordenes de trabajo y clientes API existentes.
- Las cotizaciones pueden quedar vinculadas a una reserva y pueden guardar fecha/hora tentativa de reserva sin que esos campos sean obligatorios.

## Contrato API

- `POST /api/reservations/` acepta payload viejo con `service` o payload nuevo con `items`.
- `POST /api/reservations/{id}/quote/` crea o devuelve la cotizacion vinculada a la reserva.
- `POST /api/quotes/{id}/reservation/` crea o devuelve la reserva vinculada a la cotizacion. Si la cotizacion no tiene fecha tentativa, el payload debe incluir `day`; si no tiene vehiculo, debe incluir `vehicle`.
- Los items de cotizacion exponen `service_notes` para mostrar las notas del servicio debajo del nombre.

## Compatibilidad

- Las reservas existentes se migran a un item unico usando el servicio que ya tenian.
- La orden de trabajo vinculada conserva un servicio principal, pero su total automatico usa la suma de los items de la reserva.
