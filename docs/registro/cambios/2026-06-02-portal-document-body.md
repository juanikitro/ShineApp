# fix(ui): portal de desplegables a document.body

**Fecha:** 2026-06-02
**Rama:** claude/elated-khorana-8bf6cc

## Problema

Los desplegables (SearchSelect y QuickActionsMenu) no se abrían dentro de modales: al hacer click en el trigger el campo se destacaba pero el menú no aparecía.

## Causa raíz

Los portales usaban `.app-shell` como contenedor DOM. `.app-shell` es un `display: grid` container; sus hijos directos con `z-index` crean stacking contexts **locales**. El `modal-backdrop` se renderiza fuera de `.app-shell` (como hermano en `<body>`). Aunque el `combo-menu` tenía `z-index: 1030` y el backdrop `z-index: 1000`, el combo-menu quedaba dentro del stacking context de `.app-shell` y no podía superar al backdrop en el stacking context raíz.

## Fix

- `SearchSelect.getPortalContainer()` → `document.body`
- `QuickActionsMenu.portalContainer` → `document.body`

Con el portal en `document.body`, backdrop y combo-menu son hermanos en el mismo stacking context (raíz), y z-index 1030 > 1000 gana sin ambigüedad.

## Dark theme

`page.tsx` ya aplica `document.documentElement.dataset.theme = themeMode` en un `useEffect`, por lo que `:root[data-theme='dark']` (definido en `tokens.css`) cubre los portales en `document.body` sin cambios adicionales.

## Archivos modificados

- `frontend/app/components/ui/SearchSelect.tsx`
- `frontend/app/components/ui/QuickActionsMenu.tsx`
