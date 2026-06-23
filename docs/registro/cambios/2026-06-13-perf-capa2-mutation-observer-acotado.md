# Performance Capa 2: MutationObserver acotado al subárbol mutado

## Contexto

Auditoría de performance (2026-06-12/13). `useButtonHoverTitles` instalaba un
`MutationObserver` sobre `document.body` con `subtree: true`. En cada mutación
del DOM (re-render de cualquier lista, keystroke, etc.) disparaba
`scheduleApply()` → `applyButtonHoverTitles()` sin argumento → `querySelectorAll('button')`
sobre **todo el documento**. En vistas con muchas filas (movimientos de caja,
clientes, tareas) cada re-render acumulaba un sweep innecesario.

## Cambio

`frontend/lib/page-support.tsx` — callback del `MutationObserver` (antes
`scheduleApply` directamente, ahora función inline):

- **Tooltip activo (`activeButton`)**: sólo reposiciona. `showTooltip()` ya
  llama a `applyButtonHoverTitles(button.parentElement)` de forma lazy al
  hover, así que el sweep completo es innecesario mientras hay un botón activo.
- **Sin tooltip**: barre sólo los subelementos que efectivamente mutaron
  (`m.target` o su `parentElement`), deduplicando con un `Set<ParentNode>`.
  Evita `querySelectorAll('button')` global en cada render de lista.

El `scheduleApply()` inicial (línea fuera del observer) y los listeners de
`resize`/`scroll` conservan el sweep completo — es correcto en esos casos.

## Impacto esperado

- Elimina O(botones-en-doc) por cada mutación de lista. En vistas con cientos
  de filas y botones de acción, el INP mejora al dejar de saturar el main
  thread con sweeps globales en cada re-render.

## Archivos modificados

- `frontend/lib/page-support.tsx`

## Validación

- `npx tsc --noEmit`: sin errores.
