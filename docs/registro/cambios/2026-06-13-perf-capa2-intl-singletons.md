# Performance Capa 2: formatters Intl cacheados

## Contexto

Auditoria de performance (2026-06-12/13). `money`, `quantity`,
`formatDateLabel`, `formatDateTimeLabel` y los labels de dia en
`frontend/lib/page-support.tsx` construian un `Intl.*` nuevo en cada llamada (via
`toLocaleString` / `toLocaleDateString` con opciones), por fila y por render en
listas grandes (clientes, caja, dashboard, agenda). Construir el formatter es la
parte cara; `.format()` es barato.

## Cambio

- Nuevo `frontend/lib/intl-format.ts` con singletons a nivel modulo:
  `currencyArsFormatter`, `decimalFormatter` y los `DateTimeFormat`
  (weekdayShort, dayMonth, fullDate, dateTime, date).
- `frontend/lib/page-support.tsx`: `money`, `quantity`, `formatDayName`,
  `formatDayLabel`, `formatFullDateLabel`, `formatDateTimeLabel` y `formatDateLabel`
  reusan esos singletons. Salida identica (toLocaleString usa Intl con las mismas
  opciones); sin cambios de firma ni de output.

## Impacto esperado

- Menos trabajo en el main thread por fila/render en todas las listas (INP). El
  formatter se construye una sola vez por proceso.

## Archivos modificados

- `frontend/lib/intl-format.ts` (nuevo)
- `frontend/lib/page-support.tsx`

## Validacion

- `npx tsc --noEmit`: sin errores.
- `npx vitest run lib/`: 319 passed (32 archivos).
