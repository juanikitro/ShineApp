# Performance Capa 2: useMemo en derivaciones caras

## Contexto

Auditoria de performance (2026-06-12/13). `FixedExpensePanel` recomputaba 6
pasadas de filter/reduce sobre `occurrences` y `fixedExpenses` en cada render,
incluido cada keystroke del buscador (es estado que re-renderiza el panel).

## Cambio

- `FixedExpensePanel.tsx`: las derivaciones se separan en memos:
  - independientes del buscador (`pending`, `paid`, `pendingTotal`, `activeCount`,
    `monthlyEstimate`): keyed en `[occurrences]` / `[fixedExpenses]`, no recomputan
    al tipear.
  - dependientes del buscador (`filteredPlans`, `filteredPending`): keyed en
    `[..., search]`, lo unico que recomputa por keystroke.

## No incluido (deliberado)

- La derivacion de `DashboardPanel` (lineas ~99-305) es aritmetica O(1)
  (`numberValue`/`Array.isArray`) y las de `DashboardCrossReadings` /
  `DashboardCashByCategory` son reduces sobre arrays chicos (aging ~4 buckets,
  categorias <20). Memoizarlas seria churn sin ganancia medible. El costo real del
  dashboard es renderizar los componentes hijos (motion/AnimatedNumber), que se
  ataca con la memoizacion de filas/callbacks (PR9/PR17), no con la aritmetica.

## Impacto esperado

- Tipear en el buscador de gastos fijos solo recomputa los 2 filtros, no las 6
  pasadas. Menos trabajo por keystroke a medida que crecen las ocurrencias.

## Archivos modificados

- `frontend/app/components/fixed-expenses/FixedExpensePanel.tsx`

## Validacion

- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 430 passed.
