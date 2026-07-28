# Reservas: apertura directa en edición

## Objetivo

Al abrir una reserva, mostrar directamente el formulario de edición en lugar de
la vista de detalle previa.

## Decisión

Centralizar la regla en `openDetailModal`: las entidades de tipo `reservation`
se abrirán con `editing` activo. Esto cubre las tarjetas de cliente, servicio,
agenda y cualquier futura llamada que use ese punto de entrada.

## Alcance y compatibilidad

- Se reutiliza `ReservationDetailEditor` y el modal existente.
- Se preservan validaciones, guardado, descarte de cambios y permisos actuales.
- Los demás tipos de detalle siguen abriendo en modo lectura, salvo cuando sus
  callers ya solicitan explícitamente edición.
- No hay cambios de API, datos ni endpoints.

## Validación

La conducta a comprobar es que una reserva abierta desde el punto de entrada
central inicia edición de inmediato. Se ejecutará una prueba focalizada de la
regla y no una suite completa.
