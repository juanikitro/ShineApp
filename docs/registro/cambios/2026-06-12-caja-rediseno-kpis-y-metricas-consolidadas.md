# Caja: rediseno de KPIs y metricas consolidadas en dos columnas

## Cambio

La vista Caja (`displayedActive === 'cash'`) cambia la organizacion visual de la cabecera, sin tocar la logica de calculo ni los contratos del backend. Toma inspiracion estructural de un mockup propuesto y la baja al design system claro de ShineApp.

- Los 3 KPI primarios (Ingresos, Egresos, Saldo) ahora muestran:
  - un `metric-icon` (esquina superior derecha) con `TrendingUp` / `TrendingDown` / `Wallet`,
  - una pildora `cash-balance-status` debajo del saldo, con tono y leyenda segun signo:
    `Cash flow positivo` (verde) / `Cash flow negativo` (rojo) / `Cash flow equilibrado` (neutro).
- El bloque "Flujo de dinero del dia" pasa de un unico card largo a una grilla de dos columnas (`cash-flow-grid`):
  - Izquierda (`cash-flow-card--main`): toggle Flujo de caja / Resultado del dia + grupos Cobros, Pagos y Ajustes; al pie un strip `cash-flow-result` con "Resultado final" + sub-totales "Ingresos totales" y "Egresos totales", calculados desde `cashflowTotals` o `economicTotals` segun el modo activo.
  - Derecha (`cash-consolidated-card` con `aside aria-label="Metricas consolidadas"`): Balance comercial, Aportes, Inversiones, Retiros, Balance financiero y Flujo neto de dinero (este ultimo resaltado con `cash-summary-balance--highlight`).
- Se quita el bloque suelto `cash-economic-panel`: el resultado economico ya viaja en el toggle del card izquierdo y en las metricas consolidadas, asi que su mensaje era redundante.
- Sobre el listado de movimientos del dia se agrega un header de columnas (`cash-entry-columns`: Hora / Concepto / Cliente / Monto) y un footer (`cash-entry-footer`: "Mostrando N de M movimientos"), para reforzar la lectura tipo tabla sin tocar las filas (`CashEntryRow`).

## Frontend

- `frontend/app/components/cash/CashPanel.tsx`:
  - Nuevos iconos `TrendingDown`, `TrendingUp`, `Wallet`, `Scale`, `ArrowUpRight`, `ArrowDownRight`.
  - Helpers locales `cashBalanceTone` y `cashBalanceLabel` para la pildora de cash flow.
  - `renderCashSummaryBalance` acepta `{ highlight }` para el "Flujo neto de dinero".
  - Nuevo helper `renderConsolidatedRow` para las filas del card consolidado.
  - Eliminado el `<section className="cash-economic-panel">` y reescrita la seccion del flujo en `<section className="cash-flow-grid">` con `<article className="cash-flow-card cash-flow-card--main">` y `<aside className="cash-consolidated-card">`.
  - Header `cash-entry-columns` y footer `cash-entry-footer` alrededor de `cash-entry-list`.
- `frontend/app/styles/shell.css`:
  - Nuevas reglas: `cash-balance-status[--positive|--negative|--neutral]`, tintes de `metric-icon` por KPI (`cash-metric--income`, `cash-metric--expense`, `cash-metric-balance`), `cash-flow-grid`, `cash-flow-card--main`, `cash-flow-result*`, `cash-consolidated-card / -head / -body / -row`, `cash-summary-balance--row`, `cash-summary-balance--highlight` (con override para tema oscuro), `cash-entry-columns`, `cash-entry-footer`.
  - Borrado bloque `.cash-economic-panel` (markup eliminado).
  - Media query `@media (max-width: 1180px)`: la columna se colapsa a `1fr` y `cash-flow-result` apila sus sub-totales hacia la izquierda. En `<= 720px` el header de columnas se oculta para mantener el listado existente.

## Contexto

- El default visual del CRM (claro, sobrio) se mantiene; el mockup de referencia era dark navy pero las nuevas reglas usan solo tokens semanticos (`--color-primary-light`, `--color-success-bg`, etc.) y por eso el modo oscuro tambien responde sin estilos inline.
- No cambia ningun endpoint, serializer, modelo, migracion ni permiso. `buildCashFlowSummary`, `cashflowTotals` y `economicTotals` se consumen igual.

## Tests

- Tests existentes en verde (50 archivos / 427 tests). No se agregaron tests nuevos porque el cambio es de estructura/markup y no toca calculo ni props (`CashPanel` se sigue invocando con el mismo conjunto de props desde `frontend/app/page.tsx`).

## Validacion

- `npx tsc --noEmit` en `frontend/` sin errores tras regenerar `app/data/changelog.generated.json`.
- `npm run test` (vitest) en verde.
- `npm run build` (Next.js 15) compila la pagina principal sin warnings nuevos.
