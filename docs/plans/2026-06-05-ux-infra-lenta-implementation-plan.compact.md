# Plan De Implementacion: UX Para Infraestructura Lenta (compact)

> Workers: ejecutar tarea por tarea con checkboxes. Marcar `- [x]` al cerrar. Leer `AGENTS.md` y `docs/ia/TESTING.md#restriccion-de-recursos-frontend` antes.

**Objetivo:** la app no puede ir mas rapido (Vercel free + Supabase free), pero deja de **sentirse** lenta.

**PR unico** con Fases 1, 2, 4 y 3.2. Excluido: virtualizacion y SWR/React Query.

## Restricciones

- Sin librerias nuevas (no SWR/RQ/virtuoso).
- Sin cambios de contratos publicos.
- No paralelizar Vitest/build/dev frontend.
- Optimistic solo en mutaciones seguras (no stock/cash/payments/debts).
- Preservar a11y (aria-busy, aria-live, foco, teclado).
- Migrations: chequear nombre incremental real antes.

## Archivos

### Frontend modificar
- `frontend/lib/api.ts` — AbortSignal + dedup GETs + `apiPage`.
- `frontend/lib/page-support.tsx` — `useRunAction` hook.
- `frontend/lib/app-data.ts` — aceptar signal.
- `frontend/app/page.tsx` — usar hook, loadingKeys, period en deps, debounce, prefetch, stale-while-revalidate.
- `frontend/app/styles/base.css` — estilos Button y Skeleton.
- `frontend/app/styles/shell.css` — badge "Actualizando".

### Frontend crear
- `frontend/app/components/ui/Button.tsx` — primitive con `loading`, `variant`, `size`.
- `frontend/app/components/ui/Skeleton.tsx` — SkeletonLine/Card/Row/Metric/List.
- Tests: `Button.test.tsx`, `Skeleton.test.tsx`, `use-run-action.test.tsx`.

### Backend modificar
- `backend/customers/views.py` — prefetch en `history` (linea ~281) e insights (~144).
- `backend/dashboard/views.py` — prefetch en `work_order_financials` (~201).
- `backend/config/settings_production.py` — `CONN_MAX_AGE=300`.
- Views de `MeView`, `BusinessProfile`, `/services/`, `/materials/` — `patch_cache_control`.

### Backend crear
- Migrations indices: `(business, -created_at)` WorkOrder, `(business, day, status)` Reservation, `(business, paid_at)` Payment, `(business, occurred_at)` CashMovement, `(business, consumed_at)` MaterialConsumption.

### Docs
- `docs/registro/cambios/2026-06-05-ux-infra-lenta.md`.

## Tareas

### T1: Abort + dedup en `apiFetch`
- [x] aceptar `signal` en `apiFetch`/`publicApiFetch`.
- [x] `Map<key, Promise>` para dedup de GETs.
- [x] separar `apiPage<T>(path)` (no recorre next).
- [x] validar: `npx vitest run lib/api`.

### T2: `useRunAction` hook → implementado como `usePendingActions`
- [x] hook `usePendingActions` con `{begin, end, isPending(key), pending, pendingKeys}` en `page-support.tsx`.
- [x] `runAction` en `page.tsx` lo usa: begin(key) al inicio, end(key) en finally; soporta `options.key`.
- [x] tests (4 casos): toggle, multiple keys, idempotencia, no-op.
- [x] validar: `vitest run lib/use-pending-actions` + tsc verde.

Nota: el plan original tenia un hook `useRunAction` que tomaba todos los handlers (setError, reload, flash, undo, toast). Se eligio un primitive mas chico (`usePendingActions`) que se compone con el `runAction` existente — diff menor, mismo objetivo (exponer pending por key).

### T3: `<Button>` reutilizable
- [ ] `frontend/app/components/ui/Button.tsx` con `loading`, `variant`, `size`, `disabled`, `aria-busy`.
- [ ] estilos: `.is-loading`, `[aria-busy]`, `.button-spinner`, `@keyframes button-spin`, `.button-sm`.
- [ ] tests render.
- [ ] validar: `npx vitest run app/components/ui/Button`.

### T4: Skeletons
- [ ] `Skeleton.tsx` con `SkeletonLine/Card/Row/Metric/List`.
- [ ] estilos `.skeleton`, `@keyframes skeleton-shimmer`, variantes dark.
- [ ] tests render.
- [ ] validar: `npx vitest run app/components/ui/Skeleton`.

### T5: `loadData` con loadingKeys + abort + stale-while-revalidate
- [ ] reemplazar `loading: boolean` por `loadingDataSets: Set<DataSetKey>` (mantener `loading` para login/audit log).
- [ ] `loadDataAbortRef`, cancelar request previo al disparar nuevo.
- [ ] `useEffect` deps: agregar `period.from`, `period.to`.
- [ ] NO vaciar state previo al cambiar scope.
- [ ] swallow `AbortError`.
- [ ] validar: `npm run build`.

### T6: Migrar forms criticos a `useRunAction` + `<Button loading>`
- [ ] instanciar `useRunAction` en `Home`.
- [ ] pasar `key` por handler: `save:customer:{id|new}`, `save:vehicle:{id|new}`, `save:reservation`, `save:payment`, `save:cash`, `save:debt`, `save:material`, `save:supplier`, `save:stock`, `save:quote`.
- [ ] reemplazar submit buttons por `<Button type="submit" loading={isActionPending(key)}>`.
- [ ] botones DELETE/toggle: key `delete:{kind}:{id}`.
- [ ] validar: `npm run build`.

### T7: Auto-refetch periodo dashboard
- [ ] debounce 400ms en `period.from/to` con `setTimeout` + `clearTimeout`.
- [ ] mantener boton "Ver periodo" como fallback.
- [ ] badge `.panel-stale-badge` cuando `isDataSetLoading('dashboard')`.
- [ ] validar: `npm run build`.

### T8: Skeletons en vistas
- [ ] dashboard: `!dashboard && isDataSetLoading('dashboard')` → `SkeletonMetric` x6.
- [ ] customers: `!customers.length && isDataSetLoading('customers')` → `SkeletonList rows=8 cols=3`.
- [ ] agenda: skeleton cards x5.
- [ ] cash, inventory: mismo patron.
- [ ] validar: `npm run build`.

### T9: Prefetch hover sidebar
- [ ] `prefetchSection(section)` con `prefetchedSectionsRef`.
- [ ] `SidebarNav` acepta `onItemHover`, dispara en `onMouseEnter`/`onFocus`.
- [ ] validar: `npm run build`.

### T10: Optimistic en work order status (solo)
- [ ] helper `runOptimistic({key, optimistic, rollback, action})`.
- [ ] aplicar a `setWorkOrderStatus` (PATCH `/work-orders/{id}/status/`).
- [ ] NO aplicar a stock/cash/payments/debts.
- [ ] validar: `npm run build`.

### T11: `next/image` para avatares
- [ ] sidebar avatar (~page.tsx:11501): `<Image unoptimized width={32} height={32} loading="lazy">`.
- [ ] `next.config` images.remotePatterns si requiere.
- [ ] validar: `npm run build`.

### T12: Indices Postgres
- [ ] listar migrations actuales antes:
```powershell
ls backend/workorders/migrations
ls backend/scheduling/migrations
ls backend/finance/migrations
ls backend/inventory/migrations
```
- [ ] `AddIndex(WorkOrder, ['business','-created_at'])` en `workorders/migrations/00XX`.
- [ ] `AddIndex(Reservation, ['business','day','status'])` en `scheduling/migrations/00XX`.
- [ ] `AddIndex(Payment, ['business','paid_at'])` en `finance/migrations/00XX`.
- [ ] `AddIndex(CashMovement, ['business','occurred_at'])` en `finance/migrations/00XX`.
- [ ] `AddIndex(MaterialConsumption, ['business','consumed_at'])` en `inventory/migrations/00XX`.
- [ ] validar:
```powershell
cd backend
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py migrate --plan
.\.venv\Scripts\python.exe -m pytest -q
```

### T13: N+1 customers + dashboard
- [ ] `CustomerViewSet.history`: `.select_related('vehicle','service').prefetch_related('payments','material_consumptions__material')`.
- [ ] `build_customer_list_insights`: `.select_related('service','vehicle')`.
- [ ] `dashboard work_order_financials`: prefetch consistente antes del loop.
- [ ] validar: `py -3 -m pytest backend/customers backend/dashboard`.

### T14: Cache HTTP semi-estaticos
- [ ] `patch_cache_control(response, private=True, max_age=60)` en `MeView`.
- [ ] `max_age=300` en BusinessProfile.
- [ ] `max_age=120` en `/services/`, `/materials/`.
- [ ] `apiFetch` respeta `options.cache` (no forzar `no-store` siempre).
- [ ] llamadas a estos endpoints con `{ cache: 'default' }`.
- [ ] validar: `py -3 -m pytest`.

### T15: `CONN_MAX_AGE` Supabase
- [ ] `DATABASES['default']['CONN_MAX_AGE']=300` en `settings_production.py`.
- [ ] `CONN_HEALTH_CHECKS=True`.
- [ ] documentar pooler 6543 en `docs/deployment/supabase.md` (sin cambiar URL).
- [ ] validar: `py -3 manage.py check`.

### T16: Registro spec-as-source
- [ ] `docs/registro/cambios/2026-06-05-ux-infra-lenta.md` estilo caveman.
- [ ] regenerar indices: `py -3 scripts/check_docs.py --write --skip-build`.

### T17: Validacion final + PR
- [ ] `scripts/validate.ps1`.
- [ ] check Node activo, luego `npm run build`.
- [ ] smoke Slow 3G: bloqueo + skeletons + stale-while-revalidate.
- [ ] commit + push a `claude/adoring-taussig-0856fc`.
- [ ] `gh pr create --base development` (confirmar target con usuario si dudoso).

## Notas

- Si tarea bloquea, documentar en commit y seguir; no romper orden general.
- Forms en componentes separados: migrarlos in-place y `page.tsx` consume el componente.
- 3.1 (virtualizacion) y 3.3 (SWR/RQ) quedan fuera; PR aparte si UX no alcanza.
