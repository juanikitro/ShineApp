# Performance Capa 2: Skeletons de carga en paneles faltantes

## Contexto

Auditoría de performance (2026-06-12/13). Los paneles de clientes, tareas e
inventario mostraban pantalla vacía durante la carga inicial en vez de un
estado de carga visible. `FixedExpensePanel` ya tenía el patrón correcto;
estos tres paneles no tenían prop `loading` ni skeleton.

## Cambio

Tres paneles reciben ahora `loading: boolean` y renderizan `SkeletonList`
mientras el dataset principal esté vacío y cargando:

- **`CustomerListPanel`**: `loading` requerido; skeleton de 5 filas × 3
  columnas antes del listado de clientes.
- **`TasksPanel`**: `loading` opcional (default `false`); skeleton de 5 × 3
  dentro del tabpanel de contenido.
- **`InventoryPanel`**: `loading` opcional (default `false`); skeleton de 6 × 4
  cuando `materials` y `stockMovements` estén ambos vacíos.

En `page.tsx`:
- `CustomerListPanel` recibe `loading={isDataSetLoading('customers')}`
- `InventoryPanel` recibe `loading={isDataSetLoading('materials')}`
- `TasksPanel` recibe `loading={isDataSetLoading('tasks')}`

## Impacto esperado

- CLS reducido: se evita el salto visual de vacío → contenido en carga inicial.
- Percepción de velocidad mejorada (skeleton en vez de pantalla en blanco).

## Archivos modificados

- `frontend/app/components/customers/CustomerListPanel.tsx`
- `frontend/app/components/tasks/TasksPanel.tsx`
- `frontend/app/components/inventory/InventoryPanel.tsx`
- `frontend/app/page.tsx` (3 prop additions)

## Validación

- `npx tsc --noEmit`: sin errores.
