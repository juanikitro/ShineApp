# Estados de reserva configurables por negocio

## Contexto

Hasta hoy el flujo de una reserva era fijo: `Pendiente -> Confirmada -> En proceso -> Listo -> Entregada`, con `Cancelada` como rama. No todos los negocios necesitan tanta granularidad; algunos crean reservas ya confirmadas, otros no separan "En proceso" de "Listo", y algunos prefieren eliminar la reserva en lugar de mantenerla como Cancelada.

## Decision

- Cada `BusinessProfile` expone cuatro flags booleanos: `reservation_use_pending`, `reservation_use_in_progress`, `reservation_use_ready`, `reservation_use_canceled` (default `True`).
- Los estados `Confirmada` y `Entregada` son **obligatorios**: son el ancla del flujo (reserva activa, trabajo entregado). No se pueden saltear.
- Los flags afectan tanto el flujo nuevo como el catalogo de transiciones expuesto en la UI:
  - Sin `pending`: las reservas se crean en `confirmed`. La UI no expone la accion "Confirmar".
  - Sin `in_progress`: confirmada salta al siguiente activo (`ready` o `delivered`).
  - Sin `ready`: el ultimo paso antes de `delivered` es `in_progress` (o `confirmed`).
  - Sin `canceled`: la accion "Cancelar" hace **hard delete** de la reserva (y su WorkOrder por cascada). El `destroy` REST tambien deja de exigir el estado canceled previo.
- Helpers backend (`Reservation.initial_status_for_profile`, `next_active_status`, `normalize_status_for_profile`, `enabled_flow_statuses`) centralizan la decision para no esparcir condicionales.
- Helpers frontend (`reservation-status-config.ts`) replican la misma logica; `buildWorkStatusColumns(config)` arma columnas dinamicas del tablero.

## Migracion de reservas existentes

Al guardar la configuracion del negocio (PATCH `business-profile`):
- Si un flag `True -> False`, se migran en bulk las reservas del negocio que esten en ese estado al siguiente estado activo (`Reservation.objects.filter(status=X).update(status=next_active)`).
- Si se desactiva `canceled`, las reservas Cancelada existentes se eliminan en bulk.
- Se registra un unico evento de auditoria con el resumen `{status -> {action, target, count}}`.

## Trade-offs

- Aceptamos que las reservas migradas no preservan el estado original; queda registro en el audit log de la accion masiva.
- El default `pending` del campo `status` en el modelo se mantiene; el serializer decide el estado inicial cuando crea sin recibirlo explicito. Las creaciones backend directas (seed, scripts) sin pasar por serializer siguen naciendo en `pending`.
- Las constantes `Reservation.active_statuses()` y `WorkOrder.operational_statuses()` no cambian (compat); el codigo nuevo usa `enabled_flow_statuses(profile)`.

## Validacion esperada

- Crear reserva con `reservation_use_pending=False` -> nace en `confirmed`.
- POST `/reservations/:id/cancel/` con `reservation_use_canceled=False` -> 204 y reserva eliminada.
- PATCH del profile que desactiva `in_progress` -> reservas en ese estado pasan a `ready` (o `delivered` si tampoco hay `ready`).
- Tablero del frontend renderiza solo las columnas activas; drag-drop sigue funcionando con la columna `dropStatus` correcta segun la config.
