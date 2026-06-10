# Turnera: atajos para abrir la landing publica desde la app

## Cambio

Dos atajos visuales para acceder a la turnera publica desde el CRM:

- En **Configuracion > Turnera**, al lado del input "URL publica" aparece un boton "Abrir" que abre la landing en una pestana nueva. Solo se renderiza si hay slug; si todavia no hay negocio, el boton no aparece.
- La **imagen del negocio en el sidebar** deja de redirigir a la configuracion del negocio y pasa a ser un link a la turnera (`/publica/<slug>`), tambien en pestana nueva. Cuando no hay slug se mantiene el fallback anterior (boton hacia Configuracion > Negocio).

## Frontend

- `frontend/app/components/settings/TurneraSettingsPanel.tsx`: el input de URL publica queda envuelto en un wrapper `.landing-config-url` con un `<a class="ghost inline-link-button">` al lado. El link usa `target="_blank" rel="noreferrer"` y reusa los tokens existentes (`inline-link-button` ya estaba definido en `base.css`). Se importa el icono `ExternalLink` de `lucide-react`.
- `frontend/app/page.tsx`: el `header` del `SidebarNav` ahora renderiza un `<a class="ghost sidebar-business-button">` apuntando a `/publica/${currentUser.business.slug}` cuando hay slug. Si no hay slug, conserva el `<button>` original que abre Configuracion > Negocio (no se elimina el comportamiento previo para usuarios sin negocio creado).
- `frontend/app/styles/shell.css`:
  - Nuevo `.landing-config-url` (flex row con gap) y reglas para que el input flexee y el boton no se reduzca.
  - `.sidebar-business-button` ahora setea `color: inherit` y `text-decoration: none` para que el `<a>` se vea identico al `<button>` previo.

## Tests

Frontend:
- `TurneraSettingsPanel.test.tsx`: dos casos nuevos. Con `businessSlug="king-shine"` el link "Abrir turnera en una nueva pestana" aparece como `<a target="_blank">` apuntando a `/publica/king-shine`; con slug vacio el link no se renderiza. Los tres tests previos siguen verdes.
- `app/components/layout/layout.test.tsx`: sin cambios; el `SidebarNav` solo expone un slot `header` y los tests existentes no validan su contenido.

## Validacion

- Typecheck: `tsc --noEmit` sin errores.
- Tests: `vitest run --maxWorkers=1` (47 archivos, 405 tests passed).

## Notas

- No cambia contratos de API ni el payload de `BusinessProfile`. El link usa el slug que ya viene en `currentUser.business.slug`.
- El comportamiento previo del logo del sidebar (abrir Configuracion > Negocio) queda como fallback para casos sin slug; el camino primario ahora es la turnera.
