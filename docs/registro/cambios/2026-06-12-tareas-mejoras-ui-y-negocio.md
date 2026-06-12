# Mejoras al modulo de tareas (UI, interaccion y negocio)

## Que cambio

Iteracion mayor sobre el modulo de tareas: polish visual, interacciones nuevas
(inline edit, undo, optimistic), vinculacion a cliente/vehiculo, tareas
recurrentes y notificacion por email al asignar. Sin cambios en el contrato de
roles.

## Frontend

- **Busqueda**: input nuevo que filtra por titulo, descripcion, asignado,
  cliente y vehiculo (case-insensitive).
- **Filtro por vencimiento**: select `Todas / Vencidas / Hoy / Esta semana`.
- **Agrupado por fecha**: las pendientes se agrupan en cubetas `Vencidas`,
  `Hoy`, `Esta semana`, `Mas adelante`, `Sin vencimiento`. Las completadas
  siguen detras del toggle `Mostrar/Ocultar completadas`.
- **Default del toggle empleador**: ahora arranca en "Todas" en lugar de
  "Asignadas". El orden de las pestanas pasa a `Todas / Asignadas / Sin
  asignar`.
- **Inline edit**: prioridad, vencimiento y asignado son chips clicables que
  abren un popover para editarlos sin abrir el modal completo. Solo visible
  para usuarios con permiso de edicion.
- **Undo delete**: al borrar una tarea aparece toast "Deshacer". Implementado
  via `runAction({ undo })` + nuevo endpoint `POST /api/tasks/:id/restore/`.
  Como efecto adicional, se completo el bug pre-existente de
  `executePendingUndo` (no estaba invocando `pending.execute()`), por lo que
  los otros undos del producto (reservas movidas, work-order status, PDF
  enviado) tambien deshacen ahora.
- **Optimistic UI**: completar / reabrir actualiza el estado local antes de la
  respuesta del backend usando `runOptimistic`; revierte si el server falla.
- **A11y**: las pestanas usan `role="tab"` con `aria-controls` apuntando al
  `role="tabpanel"` correspondiente.
- **Visual**: dot de color por prioridad al principio del titulo,
  `assignee_label`/`created_by_label` con iniciales como avatar y nombre
  amigable (cuando el username es un email, se muestra el local-part).
- **Dark mode**: chips y contenedor del toggle pasan a `--color-surface-soft`
  (theme-aware) en lugar del inexistente `--color-surface-muted`. Boton de
  completar vuelve a ser un circulo real (se anulan los `min-height/padding`
  del selector global `button`).
- **TaskForm**: nuevos selects para `Cliente`, `Vehiculo` (filtrado por
  cliente seleccionado) y `Repeticion`.

## Backend

- **Modelo `Task`**: agrega `customer` (FK nullable a `customers.Customer`),
  `vehicle` (FK nullable a `customers.Vehicle`) y `recurrence` (TextChoices
  `none / daily / weekly / monthly`).
- **`mark_done`**: si la tarea es recurrente y tiene `due_date`, genera la
  proxima ocurrencia (`spawn_next_recurrence`) avanzando la fecha segun el
  periodo. La nueva tarea hereda asignado, prioridad, cliente, vehiculo y
  descripcion.
- **`TaskSerializer`**:
  - Nuevos campos: `customer`, `customer_label`, `vehicle`, `vehicle_label`,
    `recurrence`, `recurrence_label`, `created_by_label`.
  - `assignee_label` y `created_by_label` usan `_user_display_label` que
    devuelve full_name si existe, sino el local-part del username (sin
    `@domain`).
  - Validaciones nuevas: customer y vehicle deben pertenecer al business;
    vehicle debe corresponder al customer si ambos estan presentes;
    recurrencia distinta de `none` requiere `due_date`.
- **`TaskViewSet`**:
  - Nueva accion `POST /api/tasks/:id/restore/` (idempotente; usa el
    `restore()` del `SoftDeleteMixin`, audita el evento).
  - `complete` registra el evento `create` para la ocurrencia recurrente
    generada y dispara email al nuevo assignee si corresponde.
  - `perform_create` y `perform_update` invocan
    `_notify_assignee_if_changed`, que llama a
    `notifications.service.send_task_assignment_email` cuando hay un
    assignee nuevo distinto del actor.
- **`notifications/service.py`**: nuevo helper
  `send_task_assignment_email(task, assignee)`. Omite el envio si el
  assignee no tiene email; `fail_silently=True` para que un fallo SMTP no
  rompa la transaccion. El subject incluye el titulo; el body incluye
  `due_date` y `description` si existen.
- **Migracion**: `tasks/migrations/0002_task_customer_vehicle_recurrence.py`
  (depende de `customers.0010_search_indexes`).

## Bug fix global

`executePendingUndo` en `frontend/app/page.tsx` ahora ejecuta `pending.execute()`
antes de recargar datos. El callback ya se guardaba en
`registerUndoAction({ execute: () => undo.execute(result) })` pero nunca se
invocaba; los cuatro `registerUndoAction` existentes (reserva creada, reserva
movida, work-order status, PDF + mark-sent) ya proveian una funcion `execute`
funcional, asi que la fix recupera la intencion original.

## Tests

`backend/tests/test_tasks.py` suma 11 casos nuevos: linking customer/vehicle,
rechazo cross-business, mismatch customer↔vehicle, recurrence spawn al completar,
recurrence requiere due_date, restore tras borrar, envio de email al asignar,
skips (sin email, self-assigned), email al reasignar, `assignee_label` con
nombre completo y con fallback al local-part del email. Suite total: 24 casos
pasan en local.

## Compat

- API: campos nuevos opcionales; no se renombro ni elimino nada. El frontend
  sigue funcionando con backends viejos (todos los campos nuevos son
  `?: number | null` o tienen default). El backend acepta payloads sin los
  campos nuevos.
- Migracion: `AddField` puro, idempotente y rapido sobre la tabla `task`.
