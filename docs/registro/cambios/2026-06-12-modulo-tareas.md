# Modulo de tareas para empleadores y empleados

## Que cambio

Se agrego una seccion nueva "Tareas" visible para ambos roles. El empleador puede
crear, asignar y administrar tareas del negocio; el empleado ve y resuelve las
tareas que tiene asignadas. Cada tarea tiene titulo, descripcion opcional, fecha
de vencimiento opcional y prioridad (alta/media/baja).

## Reglas de negocio

- **Crear**: ambos roles. El empleado siempre queda como `assignee` (auto-asignacion
  forzada en serializer y en `perform_create`). El empleador puede asignar a un
  empleado activo del negocio o dejar la tarea sin asignar.
- **Visibilidad**:
  - Empleador: todas las tareas del negocio (asignadas + sin asignar).
  - Empleado: solo las tareas con `assignee = self`. Las tareas sin asignar son
    recordatorios privados del empleador.
- **Editar / borrar**:
  - Empleador: cualquier tarea del negocio.
  - Empleado: solo las tareas que el creo. Las tareas asignadas por el empleador
    solo permiten completar / reabrir.
- **Completar / reabrir**: cualquier usuario con visibilidad de la tarea via
  `POST /api/tasks/:id/complete/` y `POST /api/tasks/:id/reopen/`.

## Backend

- Nueva app `backend/tasks/` (`Task` con `SoftDeleteMixin`, FK `business`,
  `assignee`, `created_by`, `completed_by`).
- `TaskViewSet` extiende `AuditedModelViewSetMixin`. `get_queryset` filtra por
  rol y aplica orden por prioridad (Case/When), `due_date` (asc nulls last) y
  `-created_at`. Filtros query: `?status=`, `?priority=`, `?assignee=me|unassigned|<id>`.
- `TaskSerializer` extiende `BusinessScopedSerializerMixin`; override `__init__`
  scopea el queryset del campo `assignee` por business (User no tiene `business`,
  asi que el scope automatico del mixin no aplica).
- Auditoria: `record_audit_event` se registra en create/update/delete (via mixin)
  y en `complete`/`reopen` (explicito) con `module="tasks"`.
- `INSTALLED_APPS` suma `"tasks"`; `config/urls.py` registra
  `router.register("tasks", TaskViewSet, basename="task")`.
- Migracion: `backend/tasks/migrations/0001_initial.py`.

## Frontend

- Nueva seccion `'tasks'` en `Section` + `sectionMeta` (`page-support.tsx`).
- `loadDataSections`, `DataSetKey` y `sectionDataSets` (`data-loading.ts`)
  cargan `tasks` + `employees` cuando la seccion esta activa.
- `app-data.ts` mapea `tasks` a `/tasks/`.
- Nav top-level: `buildNavItem('tasks')` insertado despues de `dashboard`,
  visible para empleador y empleado.
- Componentes nuevos:
  - `frontend/app/components/tasks/TasksPanel.tsx` — listado agrupado en
    pendientes / completadas, filtros por prioridad y empleado (solo empleador),
    tabs "Asignadas / Sin asignar / Todas" para empleador y
    "Pendientes / Completadas" para empleado. Acciones rapidas: completar,
    reabrir, editar, borrar (segun permisos).
  - `frontend/app/components/tasks/TaskForm.tsx` — modal (usa `ModalFrame`) con
    titulo, descripcion, fecha vencimiento, prioridad y assignee (solo empleador).
- Estilos: `frontend/app/styles/tasks.css` importado desde `globals.css`.

## Endpoints

- `GET /api/tasks/` — lista filtrada por rol y query params.
- `POST /api/tasks/` — crea.
- `PATCH /api/tasks/:id/` — actualiza (con guard de ownership para empleado).
- `DELETE /api/tasks/:id/` — soft delete con guard.
- `POST /api/tasks/:id/complete/` — marca completada.
- `POST /api/tasks/:id/reopen/` — vuelve a pendiente.

## Tests

- `backend/tests/test_tasks.py` cubre 13 casos: crear, listar, filtros, completar,
  reabrir, ownership empleado, cross-business, soft delete, ordering por prioridad
  y validacion de titulo.
- `frontend/lib/app-data.test.mjs` agrega el mapping `tasks -> /tasks/`.
