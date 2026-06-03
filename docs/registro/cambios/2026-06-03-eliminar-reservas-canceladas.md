# Eliminar reservas canceladas

## Contexto

Las reservas en estado `canceled` quedaban en la base de datos indefinidamente. No habia forma de eliminarlas desde la agenda.

## Cambio

- Las reservas canceladas exponen una segunda accion en la agenda: `Eliminar` (icono papelera, tono danger).
- La accion dispara `DELETE /api/reservations/{id}/`.
- El backend valida que la reserva este en estado `canceled` antes de permitir el borrado; cualquier otro estado retorna 400.
- Se pide confirmacion al usuario antes de ejecutar la eliminacion (igual que el flujo de cancelacion).
- No hay undo (el borrado es destructivo).
- El evento de auditoria `delete` ya estaba cubierto por `AuditedModelViewSetMixin`.

## Archivos modificados

- `backend/scheduling/views.py` — override `destroy` con guard de estado
- `frontend/lib/reservation-actions.ts` — tipo `'delete'` y accion para estado `canceled`
- `frontend/app/page.tsx` — rama `delete` en `runAgendaReservationAction`, `requiresConfirm`, icon y tone

## Validacion

- 2 tests backend nuevos: borrado exitoso de reserva cancelada (204) y rechazo de borrado en estados no cancelados (400). Pasan.
- Tests frontend actualizados para el estado `canceled`. Validacion manual desde worktree: node_modules no disponibles; los tests se verifican al mergear a main.
