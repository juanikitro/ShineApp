# Reservas Con Trabajo Embebido

## Decision

UI trata reserva como entidad operativa principal. Orden de trabajo queda en backend: soporte interno para pagos, consumo de materiales, costos y estados de ejecucion. No aparece como entidad separada para usuario.

## Backend

- `WorkOrder` sigue existiendo: protege contratos de caja, inventario, dashboard y notificaciones.
- Cuando reserva queda en estado distinto de `pending` o `canceled`, backend asegura `WorkOrder` asociada de forma idempotente.
- Si reserva vuelve a `pending` o `canceled`, orden existente no se borra. Puede tener pagos, consumos o historial operativo.
- `ReservationSerializer` expone `work_order` como resumen embebido de solo lectura; frontend muestra datos de trabajo desde reserva.

## Frontend

- Agenda renderiza tarjeta de reserva enriquecida.
- No se muestra boton para crear orden: confirmar o completar reserva dispara creacion automatica del trabajo interno.
- No se renderizan ordenes manuales como filas de Agenda.
- Cobros, consumo de materiales y avance de estado se ejecutan desde tarjeta de reserva cuando existe trabajo activo.

## Validation

- Backend: tests de creacion automatica e idempotencia al crear o confirmar reservas operativas.
- Frontend: `npm run build`.
