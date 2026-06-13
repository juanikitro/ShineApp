# UI: card de cliente accesible, sesion expirada y refactor de tokens (2026-06-12)

**Problema:** Segunda pasada sobre los items abiertos del audit UI/UX (los que
no entraban en #148), mas el codigo nuevo que trajo #147 (rework de listado de
clientes y agenda):

- Las quick-actions de la card de cliente solo abrian con click derecho
  (`onContextMenu`) -> inalcanzables en touch/teclado.
- En mobile la card de cliente ocultaba TODAS las stats operativas
  (`display:none`).
- `/auth/me` fallaba con token guardado y caia a login sin explicar.
- Detalle-edicion de proveedor sin teclados mobile en tel/email.
- Valores CSS fuera de token (sombra repetida, hex exactos a token, `tasks.css`
  100% en rem).

## Fix aplicado

**Card de cliente** (`CustomerListPanel.tsx`, `shell.css`)
- Boton kebab visible y accesible (touch + teclado) que abre las quick-actions
  via `onOpenQuickActions`; antes solo existia el atajo `onContextMenu`.
- En mobile la card muestra 2 stats clave (proxima visita + saldo) en vez de
  ocultar el bloque entero; se ocultan ultima-visita y vehiculos por
  `nth-child`.
- Buscador `type="search"`; iconos de accion 15->16; pills `customer-pill`/
  `customer-chip` de `--radius-full` a `--radius-md`.

**Agenda** (`AgendaBoardToolbar.tsx`): chevrons de navegacion 17->18.

**Sesion expirada** (`page.tsx`, `LoginScreen` en `page-support.tsx`)
- Estado `sessionExpired` seteado en el catch de `/auth/me` (token invalido), se
  limpia al loguear ok. Aviso `role="alert"` "Tu sesion expiro" en el login.

**Teclados mobile** (`page.tsx`): detalle-edicion de proveedor con
`type=tel`/`inputMode`/`autoComplete` en telefono y `autoComplete=email`.

**Refactor de tokens** (CSS de `frontend/app/styles/`, sin cambio visual)
- Sombra `0 10px 24px var(--color-shadow-soft)` repetida (13 usos en
  shell/agenda/forms) -> `var(--shadow-raise)`.
- 18 hex exactos a token -> el token semantico correspondiente
  (`#fff7ed`->`--status-pending-bg`, `#b91c1c`->`--color-danger-hover`,
  `#eaf6ff`/`#bae6fd`->`--status-confirmed-*`, etc.), respetando fallbacks
  `var(--x, #hex)` y sin tocar hex genericos.
- `tasks.css` migrado de rem a px (~44 valores), mapeando al token de la familia
  cuando cae dentro de 0.5px (`--space-*`/`--text-*`/`--radius-*`) y a px
  redondeado en caso contrario. Cambios sub-pixel, imperceptibles.

## Decisiones de alcance

- Los off-scale genuinamente one-off de `shell.css` (10/18/22px, 15/17/20px,
  duraciones 120/150/180ms) NO se snapean a la escala ni se tokenizan uno por
  uno: snapearlos mueve layouts y tokenizar cada uno legitima valores fuera de
  escala. Quedan documentados como deuda menor.

## Tests

- `tsc --noEmit`: limpio. `npm run test`: 430 tests en verde. `npm run build`:
  compila, type-check y rutas OK. CSS validado por el build (sin sombra
  literal residual, sin rem en tasks.css, sin `var(var(...))`).

## Compatibilidad

- Sin cambios de contrato backend. El refactor de tokens es zero-visual-change
  (reemplazos exactos) salvo el sub-pixel de `tasks.css`.
- El kebab reusa `onOpenQuickActions` ya existente; respeta el menu completo que
  #146 dejo solo en click derecho.
