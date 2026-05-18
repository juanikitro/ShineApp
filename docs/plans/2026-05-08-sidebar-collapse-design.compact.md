# Sidebar colapsable con solo iconos

## Objetivo

Permitir esconder y mostrar textos del sidebar para achicar o agrandar ancho sin cambiar rutas, datos ni permisos.

## Diseno

- Frontend:
  - Agregar estado local `sidebarCollapsed` en `frontend/app/page.tsx`.
  - Pasarlo a `SidebarNav`.
  - Renderizar boton icon-only arriba del sidebar para alternar entre expandido y colapsado.
  - En expandido:
    - mantener input `Buscar...`
    - mostrar labels de navegacion
    - mantener toggle de tema, `Salir` y `ShineApp`
  - En colapsado:
    - visibles solo boton de colapso e iconos de navegacion
    - ocultar `Buscar...`, labels de navegacion, toggle de tema, `Salir` y `ShineApp`
  - Reducir ancho desde CSS; iconos centrados.

## Trade-offs

- No se persiste estado en `localStorage`: alcance chico, sin otra preferencia global.
- Colapso vive en shell actual, no como primitive reusable, porque el seam real del frontend sigue en `page.tsx`, `SidebarNav.tsx` y `shell.css`.
- Priorizar accesibilidad minima con `aria-label` y `title` en botones icon-only.

## Validacion esperada

- Sidebar abierto mantiene layout actual.
- Sidebar cerrado muestra solo iconos y reduce ancho.
- Se reabre desde mismo boton superior.
- `npm run build` no deberia fallar por este cambio; rojo restante debe ser ajeno al sidebar.
