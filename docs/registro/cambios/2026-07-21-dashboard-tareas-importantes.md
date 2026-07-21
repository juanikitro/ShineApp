# Tarjeta de tareas importantes en el dashboard

## Cambios

- El dashboard muestra una tarjeta compacta de tareas pendientes antes de sus
  indicadores economicos.
- La tarjeta lista hasta tres tareas por prioridad y vencimiento, distingue las
  vencidas y mantiene un acceso directo a la seccion Tareas.
- Cuando no hay pendientes, informa ese estado sin ocultar el acceso para
  gestionar tareas.

## Alcance

- Reutiliza el listado de tareas ya cargado por la pantalla principal.
- No agrega endpoints, permisos ni acciones que completen, editen o eliminen
  tareas desde el dashboard.

## Validacion

- Tests focalizados del selector de tareas y de la tarjeta de dashboard.
