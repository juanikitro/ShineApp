# Desplegable de SearchSelect en portal fijo

## Cambio

El menu del combo `SearchSelect` (`frontend/app/components/ui/SearchSelect.tsx`) ahora se renderiza con `createPortal` dentro de `.app-shell` y se posiciona con `position: fixed` anclado al trigger.

Antes el menu era `position: absolute` dentro de `.combo-field`, que vive en el `.modal-panel` (un contenedor con `overflow-y: auto`). Un descendiente absoluto suma al area scrolleable del contenedor, asi que al abrir el desplegable cerca del borde inferior el modal crecia y aparecia un scroll interno: habia que scrollear dentro del modal para ver las opciones.

Al portar el menu fuera del panel:
- el desplegable deja de formar parte del area scrolleable del modal, asi que abrirlo ya no fuerza scroll,
- se ubica con coordenadas fijas calculadas desde `getBoundingClientRect` del trigger, con flip hacia arriba cuando no hay espacio abajo y clamp al viewport,
- reposiciona en `scroll` (captura) y `resize` mientras esta abierto, y cierra por click afuera (`mousedown`) o foco que sale del trigger/menu,
- usa `z-index: calc(var(--z-modal-panel) + 20)` para quedar sobre el modal, reusando el patron de `QuickActionsMenu`.

Como el menu portado queda fuera del foco atrapado del modal (`ModalFrame` + `trapFocusWithin`), `Tab`/`Shift+Tab` se atrapan dentro del propio menu mientras esta abierto, conservando la navegacion por teclado. `Escape`, seleccion y click afuera cierran y devuelven foco al trigger.

CSS en `frontend/app/styles/base.css`: `.combo-menu` pasa de `position: absolute` (con `left/right/top`) a `position: fixed` con `min/max-width` por viewport; se elimino el override mobile `position: static` que ya no aplica con portal.

## Criterio

Es la solucion estandar para desplegables dentro de contenedores con `overflow`: portar el popover para que escape el scroll del ancestro. Se reuso el patron existente de `QuickActionsMenu` (portal a `.app-shell`, fijo, clamp, cierre por afuera) en vez de introducir uno nuevo. No cambia el contrato del componente ni su API; cubierto por `frontend/app/components/ui/ui.test.tsx` (incluye test que verifica que el menu se renderiza en portal con coordenadas fijas).
