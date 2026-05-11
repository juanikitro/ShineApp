# Reactivar reservas canceladas

## Contexto

Una reserva en estado `canceled` seguia visible en la agenda, pero no tenia una accion directa para volver al flujo operativo.

## Cambio

- Las reservas canceladas muestran la accion `Activar` en la agenda.
- `Activar` reutiliza `POST /api/reservations/{id}/confirm/`.
- La activacion conserva las validaciones existentes del serializer, incluida la capacidad diaria.
- Si la activacion es valida, la reserva vuelve a `confirmed` y el backend asegura la orden de trabajo asociada.

## Validacion

- Se agregaron tests frontend para las acciones por estado de reserva.
- Se agregaron tests backend para reactivar una cancelada y para rechazar la reactivacion si el dia esta completo.
