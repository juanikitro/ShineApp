# Reservas Con Trabajo Embebido

## Decision

La UI debe tratar a la reserva como la entidad operativa principal. La orden de trabajo se conserva en backend como soporte interno para pagos, consumo de materiales, costos y estados de ejecucion, pero deja de aparecer como una entidad separada para el usuario.

## Backend

- `WorkOrder` sigue existiendo para proteger los contratos de caja, inventario, dashboard y notificaciones.
- Cuando una reserva queda en un estado distinto de `pending` o `canceled`, el backend asegura una `WorkOrder` asociada de forma idempotente.
- Si una reserva vuelve a `pending` o `canceled`, la orden existente no se borra. Puede tener pagos, consumos o historial operativo.
- `ReservationSerializer` expone `work_order` como resumen embebido de solo lectura para que el frontend muestre datos de trabajo desde la reserva.

## Frontend

- Agenda renderiza una tarjeta de reserva enriquecida.
- No se muestra un boton para crear orden: confirmar o completar la reserva dispara la creacion automatica del trabajo interno.
- No se renderizan ordenes manuales como filas de Agenda.
- Cobros, consumo de materiales y avance de estado se ejecutan desde la tarjeta de reserva cuando existe trabajo activo.

## Validation

- Backend: tests de creacion automatica e idempotencia al crear o confirmar reservas operativas.
- Frontend: `npm run build`.
