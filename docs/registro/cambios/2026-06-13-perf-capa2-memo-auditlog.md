# Performance Capa 2: React.memo en AuditLogCard + useCallback para label mappers

## Contexto

Auditoría de performance (2026-06-12/13). `AuditLogCard` se re-renderizaba
en cada cambio de estado de `page.tsx` (sección activa, notificaciones, etc.)
aunque ninguno de sus props hubiera cambiado, porque las funciones
`auditActionLabel` y `auditModuleLabel` se recreaban en cada render del
componente raíz.

## Cambio

- **`AuditLogCard.tsx`**: envuelta con `React.memo`. El componente ahora
  omite el re-render si `item`, `expanded`, `currentUserId`, `onToggle`,
  `onAuditActionLabel` y `onAuditModuleLabel` son todos iguales por referencia
  al render previo.

- **`page.tsx`**: `auditActionLabel` y `auditModuleLabel` convertidas de
  `function` declarations a `const = useCallback(..., [])`. Cierran sobre
  constantes de módulo (`auditActionLabels`, `auditModuleLabels`) por lo que
  `[]` como dependencias es correcto y garantiza referencia estable para toda
  la vida del componente.
  - `useCallback` agregado a los imports de React.
  - `onToggleAuditLog` ya era estable (`setExpandedAuditLogId` de `useState`).

## No incluido (deliberado)

- `CashEntryRow` y `FinanceRecordCard`: sus callbacks son funciones inline por
  fila (`() => onAbrir(item)`) y no pueden estabilizarse sin cambiar su API
  (pasarles `handler + item` en vez de una callback pre-ligada). El memo sería
  un no-op en esos casos.

## Impacto esperado

- Filas del log de auditoría no se re-renderizan al cambiar la sección activa,
  abrir notificaciones u otros cambios de estado de `page.tsx`. Solo
  re-renderizan cuando cambia `expandedAuditLogId` (toggle de la fila) o
  cuando se cargan nuevos `auditLogs`.

## Archivos modificados

- `frontend/app/components/ui/AuditLogCard.tsx`
- `frontend/app/page.tsx` (imports React + 2 funciones)

## Validación

- `npx tsc --noEmit`: sin errores.
