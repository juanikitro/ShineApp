# Mejoras de usabilidad del modulo de tareas

## Que cambio

Se mejoro la usabilidad del modulo de tareas en cuatro areas:

### Badge de pendientes en sidebar

- El item "Tareas" del sidebar ahora muestra un contador con las tareas pendientes del usuario/negocio.
- El badge se muestra en rojo cuando hay al menos una tarea vencida, y en azul (primario) cuando no hay vencidas pero si pendientes.
- Se agrego `badgeVariant?: 'default' | 'danger'` al tipo `SidebarNavItem` y a `SidebarNav` para soportar esta distincion visual.

### Tareas vencidas mas visibles

- El encabezado del bucket "Vencidas" en el panel de tareas ahora incluye un icono de alerta (`AlertTriangle`) junto al titulo.
- Las filas de tareas vencidas ahora tienen un borde izquierdo solido rojo (`3px solid --color-danger`) ademas del borde perimetral, lo que las distingue claramente del resto.

### Descripcion inline en lugar de `<details>`

- La descripcion de cada tarea ahora se muestra directamente en la fila, sin necesidad de expandir un `<details>`.
- Descripciones de mas de 120 caracteres se truncan con elipsis y muestran un boton "Ver mas / Ver menos".
- Descripciones cortas son completamente visibles sin interaccion.

### Filtros como chips

- Los selects de "Prioridad" y "Vencimiento" se reemplazaron por grupos de botones tipo chip.
- Cada opcion es un boton visible que se activa con un click, sin necesidad de abrir un dropdown.
- El chip "Vencidas" activo se colorea en rojo para mantener coherencia con el resto del sistema.
- El select de "Empleado" se conserva como dropdown (cantidad variable de opciones).

## Archivos modificados

- `frontend/app/components/layout/SidebarNav.tsx`
- `frontend/app/components/tasks/TasksPanel.tsx`
- `frontend/app/styles/shell.css`
- `frontend/app/styles/tasks.css`
- `frontend/app/page.tsx`
