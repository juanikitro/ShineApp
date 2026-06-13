# Performance Capa 2: lookups O(1) en render (Map en vez de find)

## Contexto

Auditoria de performance (2026-06-12/13). Algunos paneles hacian `.find()` dentro
de `.map()` en render: un join de dos arrays por fila = O(filas x dataset).

- `ServicesPanel`: en los detalles del servicio, cada fila de reservas / trabajos /
  cotizaciones hacia `reservations.find(...)` / `workOrders.find(...)` /
  `quotes.find(...)` sobre el dataset completo.
- `InventoryPanel`: cada unidad abierta hacia `materials.find(...)` sobre todo el
  dataset de materiales.

## Cambio

- `ServicesPanel.tsx`: Maps memoizados `reservationsById`, `workOrdersById`,
  `quotesById` (useMemo por dataset); los `.find()` pasan a `.get(String(id))`.
  Ademas `sectorNameById` (que se reconstruia en cada render) ahora es useMemo.
- `InventoryPanel.tsx`: Map memoizado `materialsById`; el `.find()` por unidad
  abierta pasa a `.get(String(item.material))`.

Mismo valor de retorno (find -> get devuelven el registro o undefined); sin cambio
de comportamiento.

## Impacto esperado

- Lookups O(1) en vez de O(n) por fila en los detalles de servicio e inventario.
  Menos trabajo en main thread a escala (INP).

## Archivos modificados

- `frontend/app/components/services/ServicesPanel.tsx`
- `frontend/app/components/inventory/InventoryPanel.tsx`

## Validacion

- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 430 passed (50 archivos).
