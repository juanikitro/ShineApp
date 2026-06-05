# Estados de reserva configurables (2026-06-05)

**Que cambio:** la pestania Configuracion > Agenda expone cuatro toggles para
saltar estados de reserva que no use el negocio: Pendiente, En proceso, Listo y
Cancelada. Confirmada y Entregada son obligatorios.

**Como funciona:**
- Saltar Pendiente: las reservas nuevas nacen Confirmada directamente.
- Saltar En proceso o Listo: el flujo brinca al siguiente estado activo. El
  tablero del work view oculta esas columnas y la barra de acciones de la
  agenda llama "Iniciar / Marcar listo / Entregar" segun el destino real.
- Saltar Cancelada: la accion "Cancelar" elimina la reserva al instante (y su
  orden por cascada). El boton se muestra como "Eliminar" en la barra.

**Al guardar la configuracion:** las reservas existentes en estados que se
desactiven se migran al siguiente estado activo (o se eliminan, si se
desactiva Cancelada). Queda asentado en el historial de auditoria con el
resumen del movimiento.

**Archivos tocados:**
- `backend/core/models.py` + `0018_businessprofile_reservation_status_flags.py`:
  flags en `BusinessProfile`.
- `backend/scheduling/models.py`: helpers `initial_status_for_profile`,
  `next_active_status`, `normalize_status_for_profile`, `enabled_flow_statuses`.
- `backend/scheduling/serializers.py`: estado inicial y normalizacion.
- `backend/scheduling/views.py`: cancel/destroy condicional al flag canceled.
- `backend/scheduling/services.py`: `realign_reservations_to_profile`.
- `backend/config/views.py`: PATCH del profile dispara la migracion masiva.
- `frontend/lib/reservation-status-config.ts`: helpers y tipos compartidos.
- `frontend/lib/reservation-actions.ts`: acciones segun config.
- `frontend/lib/work-orders.ts`: `buildWorkStatusColumns(config)`.
- `frontend/app/components/work/WorkStatusView.tsx`: columnas por prop.
- `frontend/app/page.tsx`: integra config con la UI.
- `frontend/app/components/settings/SettingsWorkspace.tsx`: cuatro toggles en
  el panel de Agenda + resumen del flujo activo.

**Tests:**
- `backend/tests/test_reservation_status_flags.py` cubre defaults, normalizacion,
  cancel/destroy con flag, migracion masiva al guardar el profile.
- `frontend/lib/reservation-actions.test.mjs` agrega casos para skip canceled
  y skip in_progress/ready.

**Decision asociada:**
`docs/registro/decisiones/2026-06-05-estados-reserva-configurables.md`.
