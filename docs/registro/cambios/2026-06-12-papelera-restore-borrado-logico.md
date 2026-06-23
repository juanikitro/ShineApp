# Papelera: ver, restaurar y purgar registros borrados

Configuracion suma una seccion **Papelera** con todo lo que el usuario haya
borrado y que el backend ya soft-deleteaba. Desde ahi se pueden restaurar
registros (con cascada inversa) o eliminarlos definitivamente.

## Estado del borrado logico (auditoria)

Modelos que ya extendian `SoftDeleteMixin` y por lo tanto soportan papelera:

- `customers`: `Customer`, `Vehicle`.
- `catalog`: `Sector`, `Service`.
- `scheduling`: `Reservation`, `ReservationItem` (item hijo: se restaura con la reserva).
- `workorders`: `WorkOrder`.
- `finance`: `Payment`, `CashMovement`.
- `inventory`: `Material`, `Supplier`, `Tool`.
- `quotes`: `Quote`, `QuoteItem` (item hijo: se restaura con la cotizacion).
- `debts`: `Debt`, `DebtPayment`.
- `fixed_expenses`: `FixedExpense`, `FixedExpenseOccurrence`.

Modelos que **NO** se exponen en papelera por diseno: `inventory.MaterialOpenUnit`,
`MaterialPurchase`, `MaterialConsumption`, `StockMovement` / `StockMovementLine`
(borrado fisico controlado desde el flujo de inventario), `finance.CashClosure`
(cierre historico inmutable), `notifications.PublicRequest` (`archived_at`
propio), `catalog.ServiceMaterial` (receta interna del servicio) y los modelos
de identidad (`core.BusinessAccount`, `BusinessProfile`, `UserProfile`).

## Backend

- `core/soft_delete.py`: el `SoftDeleteMixin` suma `restore()`, que revierte
  `deleted_at` y `is_active` usando `all_objects.update(...)` (no `save()`,
  porque el `base_manager_name = "objects"` ocultaria el registro borrado).
- Los modelos con cascada en `delete()` reciben tambien `restore()` con la
  cascada inversa: `Reservation` recupera sus items y la orden; `WorkOrder`
  sus pagos; `Payment` su movimiento de caja; `Quote` sus items; `Debt` sus
  pagos; `FixedExpense` sus ocurrencias pendientes. `Debt` y
  `FixedExpenseOccurrence` no relinkean el `cash_movement` original (la
  cascada de delete corta el FK para evitar conflictos en re-creacion); el
  movimiento queda disponible en la papelera para restaurarse aparte.
- Nuevo `core/trash.py` con el registro `TrashEntry` por tipo (clave URL,
  labels en castellano, label callable, select_related). Es la fuente
  unica de cuales modelos figuran en la papelera.
- Nuevos endpoints (permiso `EmployerOnly`, mismo scoping de negocio que el
  resto):
  - `GET /api/trash/?type=<key>&q=<texto>`: grupos por tipo con `count` y
    hasta 50 items por tipo.
  - `POST /api/trash/<key>/<id>/restore/`: revive el registro y aplica
    cascada inversa; registra `action="restore"` en audit log.
  - `DELETE /api/trash/<key>/<id>/`: hard delete; si hay FK `PROTECT`
    activos responde `409` con un mensaje claro; registra `action="purge"`.

## Frontend

- `SettingsSection` suma `'trash'` (icono `Trash2`) en el menu de
  configuracion, entre `Historial` y `Novedades`.
- Nuevo `app/components/settings/TrashSettingsPanel.tsx`: hace su propio
  fetch a `/trash/`, agrupa por tipo, filtra por tipo y por texto, y ofrece
  acciones `Restaurar` y `Eliminar`. Pide confirmacion en ambas. Muestra
  estado vacio cuando no hay nada borrado.
- Estilos en `frontend/app/styles/shell.css` (`trash-groups`,
  `trash-group-head`, `trash-feedback`).

## Tests

- Backend: `backend/tests/test_trash.py` cubre listado por tipo, scoping a
  empleador, filtro, restore basico, cascada inversa Reservation→WorkOrder→
  Payment, restore Payment→CashMovement, hard delete sobre un Supplier
  standalone y conflicto `409` cuando un Customer tiene Vehicle PROTECT.
- Suite completa `pytest` (344 tests) verde tras los cambios.
