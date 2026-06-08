# Vida y animaciones en el CRM

## Contexto

El frontend ya tenia lazy loading, skeletons y un runtime `motion` v12 con `motion-spec.ts`, pero la percepcion seguia siendo estatica al entrar/cargar: los numeros aparecian de golpe, las listas no escalonaban, los skeletons saltaban al contenido sin transicion y el sidebar no daba retroalimentacion mas alla del cambio de fondo. El pedido fue darle vida al CRM manteniendo la sobriedad visual.

## Cambio

### Nuevos primitives en `frontend/app/components/motion/`

- `AnimatedNumber.tsx`: cuenta de `from` a `value` con easing `easeOutCubic` y `requestAnimationFrame`. Acepta `format(value: number) => string` para preservar `money()`, `quantity()` y porcentajes. Respeta `prefers-reduced-motion` (muestra el valor final sin animacion). `animateOnMount=false` permite skip de la animacion inicial.
- `Stagger.tsx` / `StaggerItem.tsx`: contenedor + item con variantes `staggerContainerVariants` y `staggerItemVariants` en `motion-spec.ts`. El contenedor marca `data-motion="stagger"` para que el stagger por CSS no se duplique sobre el mismo elemento.
- `RevealOnMount.tsx`: fade + lift de 8px al montar.
- `CrossfadeSwap.tsx`: cambia entre `skeleton` y `children` con `AnimatePresence mode="wait"`.

### Extension de `frontend/lib/motion-spec.ts`

Nuevas variantes: `staggerContainerVariants`, `staggerItemVariants`, `revealOnMountVariants`, `crossfadeContentVariants`, `crossfadeSkeletonVariants`, `deltaHintVariants`.

### Dashboard (`DashboardPanel.tsx`)

- `MetricCard` acepta `numericValue` + `format` opcionales y delega en `AnimatedNumber` cuando estan presentes (sigue aceptando `value: ReactNode`, sin breaking change).
- Grid ejecutivo (Facturado, Margen, Caja, Por cobrar), grid de composicion y registros de comparacion / status entran con `Stagger`.
- `dashboardDeltaHint` consolida sus cuatro returns en uno solo envuelto en `AnimatePresence` + `m.span` con `deltaHintVariants`, asi la flecha y el porcentaje animan al cambiar de periodo.

### CSS

- Stagger automatico por CSS para listas `.records:not([data-motion])`, `.cash-entry-list`, `.cash-summary-lines`, `.dashboard-aging-bars`, `.dashboard-receivable-workorders` (hasta 12 items con delays de 0-330ms; el item N+1 hereda el ultimo delay).
- Lift sutil con `transform: translateY(-2px)` y boost de sombra en cards del dashboard al hover.
- Press (`scale(0.985) + translateY(1px)`) en `button:active` y lift (`translateY(-1px)`) en hover de `button.primary` y `button.ghost`.
- Indicador lateral animado en `.nav button::before` (barra primary que escala en Y en hover/active).
- Entrada `quote-line-enter` en `.quote-line` para que las lineas de cotizacion aparezcan al agregarse.
- Cada bloque incluye su rama `@media (prefers-reduced-motion: reduce) { ... }`.

### Caja (`CashPanel.tsx`)

`AnimatedNumber` reemplaza el render directo de `money()` en los totales primarios de caja (`cashflowTotals`) y en `Resultado del dia` (`economicTotals.balance`).

### Tests

Cobertura nueva en `frontend/app/components/motion/`:

- `AnimatedNumber.test.tsx`: valor final, custom `format`, reduced-motion, `animateOnMount=false`, transicion entre valores, NaN.
- `Stagger.test.tsx`: estructura + atributos a11y.
- `CrossfadeSwap.test.tsx`: render condicional.

Total: 359 tests en verde, build de produccion OK.

## Decisiones

- Reutilizamos `motion` v12 + `motion-spec.ts` en lugar de introducir otra libreria de count-up.
- Stagger por CSS para listas genericas (cero JSX para 20+ paneles); Stagger por componente solo donde la estructura ya esta en el dashboard. Opt-out via `data-motion`.
- `MetricCard` mantiene `value: ReactNode` para no romper consumidores existentes; `numericValue` es aditivo.
- `prefers-reduced-motion` se respeta en todos los bloques nuevos (CSS + JS). `AppMotionProvider` ya viene con `reducedMotion="user"`.
- Backend / endpoints / permisos / contratos no cambian.

## Validacion

```powershell
cd frontend
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
node ./node_modules/next/dist/bin/next build
```
