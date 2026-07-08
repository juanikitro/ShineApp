# Cotizaciones y reservas grupales por auto

## Contexto

Clientes con varios autos necesitaban un unico documento comercial, pero la operacion de agenda, trabajo, deuda y cobro sigue siendo individual por auto.

## Cambio

- `Quote` puede ser grupal con lineas de auto e items por linea.
- `POST /api/quotes/` acepta `vehicle_lines` y puede crear reservas hijas con `create_reservations=true`.
- `POST /api/quotes/{id}/reservations/` agenda una cotizacion grupal existente en una transaccion.
- `POST /api/reservations/{id}/quote/` devuelve el documento grupal cuando la reserva viene de una linea hija.
- Los formularios de cotizacion y reserva tienen modo individual/grupal con editor de autos, servicios, agenda por auto y limite de 25.
- El PDF y las tarjetas de cotizacion muestran el resumen grupal.

## Reglas

- Un grupo pertenece a un solo cliente.
- Un auto nuevo requiere tipo y patente o marca/modelo.
- No se permite mezclar autos reservados con autos solo cotizados dentro del mismo grupo.
- Si una linea falla por cupo, solapamiento, vehiculo o servicio invalido, falla todo.
- No se agregan pagos grupales ni acciones masivas de estado.

## Validacion esperada

- Crear una cotizacion grupal con autos existentes e inline.
- Rechazar mas de 25 autos.
- Crear reservas hijas de forma atomica.
- Abrir la cotizacion grupal desde cualquiera de sus reservas hijas.
- Mantener cotizaciones individuales compatibles.
