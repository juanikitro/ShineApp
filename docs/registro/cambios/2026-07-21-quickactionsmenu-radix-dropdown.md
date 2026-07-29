# QuickActionsMenu: menu accesible con Radix DropdownMenu

Fecha: 2026-07-21

Cambio:
- `QuickActionsMenu` usa `@radix-ui/react-dropdown-menu` sin estilos y conserva
  su API publica, clases CSS y comportamiento (control externo, anclaje a una
  coordenada arbitraria, confirmacion inline, lock async, retorno de foco).
- El anclaje se resuelve con un `DropdownMenu.Trigger` virtual (0x0, fijo en
  `anchorPoint`, sin pointer events); Radix Popper gestiona la colision con el
  viewport y reemplaza el clamp manual. Se quita `position: fixed` de
  `.quick-actions-menu` porque ahora posiciona el wrapper de Popper.
- Radix aporta foco roving, typeahead y dismiss; la confirmacion inline y el
  lock async se conservan interceptando `onSelect` con `event.preventDefault()`.
  El dismiss/cierre queda bloqueado mientras una accion corre.
- `onCloseAutoFocus` devuelve el foco a `returnFocusRef` porque el trigger es
  virtual.

Validacion:
- `app/components/ui/QuickActionsMenu.test.ts` reescrito para la mecanica de
  Radix (control externo, confirm, lock async, roving, return focus) y
  ejecutado con Vitest: 8/8 en verde.
