# Sidebar: imagen del negocio arriba, footer reordenado, iconos de subitems y consistencia de posiciones al plegar

## Que cambio

- La imagen del negocio se movio del footer al top del sidebar. Ahora es un boton que abre la configuracion del negocio (`section: settings`, `settingsSection: business`).
- El footer del sidebar quedo con tres bloques en este orden de arriba a abajo:
  1. Fila con el switch de modo claro/oscuro a la izquierda y el boton de plegar/desplegar a la derecha.
  2. Boton de perfil con avatar y datos del usuario.
  3. Marca de ShineApp (logo + nombre).
- Al plegar el sidebar, los mismos bloques siguen visibles en el mismo orden, solo cambian de forma:
  - Imagen del negocio: rectangulo full width → cuadrado compacto (padding chico, logo max-height 44px).
  - Switch de tema: pill horizontal con track → boton circular 36x36 con icono sol/luna (sin track).
  - Boton de plegar/desplegar: queda 36x36 al lado del switch; los dos se apilan verticalmente porque el sidebar plegado mide 72 px.
  - Boton de perfil: avatar solo, centrado.
  - Marca ShineApp: solo el logo, mismo tamano (44x44) que en expandido.
- Los iconos de los subitems desplegados (por ejemplo, Cotizaciones dentro de Agenda) siguen visibles en estado plegado; antes se ocultaban.

## Detalle tecnico

- `frontend/app/components/layout/SidebarNav.tsx`:
  - Los `nav-children` se renderizan tambien con `collapsed`, mostrando solo el icono del subitem.
  - `aria-expanded` del boton padre refleja el estado real (`expanded`) sin depender de `collapsed`.
- `frontend/app/page.tsx`:
  - El `header` del `SidebarNav` renderiza el boton con el logo del negocio siempre que haya `businessProfile` y `sidebarBusinessLogoSrc` (ya no se condiciona a `!sidebarCollapsed`).
  - El switch de tema se renderiza siempre: en expandido con la estructura `theme-switch-track`/`theme-switch-thumb` y en colapsado con un wrapper `theme-switch-icon` que solo contiene el simbolo (`sun` / `moon`). El boton recibe la clase modificadora `theme-switch--compact` cuando esta plegado.
  - El `footer` se rearma con `.sidebar-footer-row` que contiene el switch de tema y el boton de plegar/desplegar; debajo el boton de perfil y abajo del todo la `AppBrand` con `className="sidebar-brand"`.
- `frontend/app/styles/shell.css`:
  - Nuevo `.sidebar-business-button` (reemplaza `.sidebar-business-card`) con estados hover/focus para boton clickeable. Al plegar, padding 4px y `max-height: 44px` para el logo.
  - Nuevo `.sidebar-footer-row` (flex row con `space-between`); al plegar pasa a columna (`flex-direction: column`, gap 6 px) para que los dos botones quepan en el sidebar de 72 px.
  - Nueva variante `.theme-switch--compact`: boton 36x36 redondo con el mismo `background` del thumb expandido. Reutiliza los simbolos sol/luna existentes (`.theme-switch-symbol--sun` / `--moon`).
  - `.sidebar-collapse-toggle` ahora vive en el footer: ancho `auto` por defecto y al plegar pasa a 36x36 para hacer pareja con el switch compacto. Se usa el selector `.sidebar-footer .sidebar-collapse-toggle` para ganar especificidad sobre `.sidebar-footer button { width: 100% }`.
  - `.sidebar-brand .app-brand-logo` queda en 44x44 fijo en ambos estados (antes 50 expandido / 40 plegado). Se elimina el override por `data-collapsed`.
  - Cuando el sidebar esta plegado, `.sidebar-profile-button` colapsa a una sola columna centrada, `.sidebar-brand` se centra y `.nav-children` deja de tener `padding-left` para que los iconos hijos queden centrados como los padres.
  - Se elimina `.sidebar-top-stack` (ya no usado).

## Validacion

- Typecheck: `tsc --noEmit` sin errores.
- Tests: `vitest run --maxWorkers=1` (37 archivos, 349 tests passed).
- Build: `next build` exitoso (corrido previamente; los cambios posteriores son CSS y un JSX condicional, sin nuevos imports ni APIs).
- Nota: el worktree no tiene `node_modules` propio; se enlazo temporalmente con junction al `node_modules` del checkout principal.

## Notas de alcance

- No cambia los contratos de API ni los datos de `BusinessProfile`.
- El click sobre la imagen del negocio navega a Configuracion y selecciona la subseccion `business`. Si el usuario no tiene permiso de Configuracion, el contenido lo decide el `SettingsWorkspace` como antes.
- La marca de ShineApp en el bottom usa los mismos estilos existentes (`.sidebar-brand`); no se introdujeron tokens nuevos.
