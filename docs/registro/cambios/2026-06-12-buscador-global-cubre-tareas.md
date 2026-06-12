# Buscador global ahora cubre tareas y se documenta la regla para modulos nuevos

## Cambio

- Nueva regla en `docs/registro/decisiones/2026-06-12-regla-feature-nueva-buscador-global.md`: toda entidad de negocio nueva debe quedar integrada al buscador global (`/search/`) antes de cerrar la tarea.
- Fila nueva en `docs/registro/errores-agentes.md` para que la IA detecte el patron "modulo nuevo fuera del buscador" como error recurrente.
- Backend: `backend/search/views.py` suma `_search_tasks` y lo expone en `GlobalSearchView`. Busca por `title`, `description`, `assignee.username`, `first_name` y `last_name`. Respeta el scope por negocio y el rol del usuario: el empleado solo ve tareas asignadas a el; el empleador ve todas.
- Frontend: `frontend/app/page.tsx` mapea `task` en `searchResultTargets` con seccion `tasks` y `apiPath = /tasks/{id}/`. `openSearchResult` corta en `task` despues de cambiar de seccion porque `TasksPanel` edita en linea (no abre modal de detalle).
- Frontend: `frontend/app/components/search/SearchResultsPanel.tsx` agrega el icono `ListTodo` en `GROUP_ICONS` para el grupo de tareas.
- Tests: `backend/tests/test_search.py` cubre encontrar tarea por titulo, descripcion y assignee, scoping por negocio, gating empleado/empleador y forma del payload.

## Alcance

- Aplica al endpoint `/api/search/` y al SPA principal.
- No cambia el contrato de `/tasks/` ni el panel de tareas.
- No agrega permisos nuevos: el filtro de visibilidad del buscador replica el del `TaskViewSet`.

## Validacion

```powershell
cd backend
py -3 -m pytest tests/test_search.py -k task
```

Validacion visual: abrir `?section=search&q=<termino>` y confirmar que el grupo "Tareas" aparece con icono propio y que el click navega a la seccion tareas.
