# Sidebar colapsable con solo iconos

## Objetivo

Permitir esconder y mostrar los textos del sidebar para achicar o agrandar su ancho sin cambiar rutas, datos ni permisos.

## Diseno

- Frontend:
  - Agregar un estado local `sidebarCollapsed` en `frontend/app/page.tsx`.
  - Pasar ese estado al componente `SidebarNav`.
  - Renderizar un boton icon-only en la parte superior del sidebar para alternar entre expandido y colapsado.
  - En expandido:
    - se mantiene el input `Buscar...`
    - se muestran labels de navegacion
    - se mantienen toggle de tema, `Salir` y `ShineApp`
  - En colapsado:
    - quedan visibles solo el boton de colapso y los iconos de navegacion
    - se ocultan `Buscar...`, labels de navegacion, toggle de tema, `Salir` y `ShineApp`
  - El ancho del sidebar se reduce desde CSS y los iconos quedan centrados.

## Trade-offs

- No se persiste el estado en `localStorage` para mantener el alcance chico y evitar sumar otra preferencia global.
- El colapso vive en la shell actual, no como primitive reusable, porque hoy el seam real del frontend sigue concentrado en `page.tsx`, `SidebarNav.tsx` y `shell.css`.
- Se prioriza accesibilidad minima con `aria-label` y `title` en botones icon-only.

## Validacion esperada

- El sidebar abierto sigue mostrando el layout actual.
- El sidebar cerrado muestra solo iconos y reduce su ancho.
- Se puede reabrir desde el mismo boton superior.
- `npm run build` no deberia fallar por este cambio; cualquier rojo restante debe ser ajeno al sidebar.
