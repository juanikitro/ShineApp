# Sidebar: solo el logo del negocio a ancho completo

## Que cambio

- La tarjeta de negocio en el footer del sidebar deja de mostrar el nombre del negocio: ahora muestra unicamente el logo.
- El logo se ajusta al ancho del sidebar (`width: 100%`) en vez de quedar fijo en un cuadro de 28x28, con `max-height` para acotar logos altos o cuadrados.
- Si el negocio no tiene logo visible (ni imagen ni miniatura de PDF), la tarjeta ya no se renderiza (antes podia quedar el recuadro con solo el nombre).
- El `alt` de la imagen pasa a ser el nombre del negocio para mantener el nombre accesible al lector de pantalla ahora que el texto visible se quito.

## Detalle tecnico

- `frontend/app/page.tsx`: nueva constante derivada `sidebarBusinessLogoSrc` que resuelve la fuente del logo (imagen o miniatura de PDF) o `null`; el bloque del footer se simplifica y se condiciona a que exista logo.
- `frontend/app/styles/shell.css`: `.sidebar-business-card` centra el logo y recorta overflow; `.sidebar-business-logo` pasa a `width: 100%`, `height: auto`, `max-height: 64px`, `object-fit: contain`. Se elimina la regla `.sidebar-business-name` (ya no se usa).

## Validacion

- Typecheck: `tsc --noEmit` sin errores.
- Tests: `vitest run app/components/layout/layout.test.tsx` (4 passed).
- Nota: el worktree no tiene `node_modules` propio; la validacion se corrio enlazando temporalmente el `node_modules` del checkout principal y luego se removio el enlace.

## Notas de alcance

- Solo afecta la tarjeta de negocio del footer del sidebar (estado expandido). El sidebar colapsado ya no mostraba esta tarjeta.
- No cambia el panel de configuracion del negocio ni el contrato de `BusinessProfile`.
