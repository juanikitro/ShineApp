# UX para infraestructura lenta (free tier Vercel + Supabase)

## Contexto

La app corre en tiers gratuitos (Vercel + Supabase). La latencia base es alta y empeora con cold starts. La UX se sentia mala: botones doble-clickeables que duplicaban registros, pantalla vacia mientras llegaban datos, cambios de fecha sin feedback, todo refetcheaba de cero.

Plan completo: `docs/plans/2026-06-05-ux-infra-lenta-implementation-plan.md` (y `.compact.md`).

## Cambio visible para el usuario

- **Botones criticos bloquean mientras hay request en vuelo**. Los 10 forms principales (cliente, vehiculo, reserva, pago, caja, deuda, material, proveedor, stock, cotizacion) usan un `<Button loading>` que se deshabilita y muestra spinner. Adios doble-click duplicador.
- **Skeletons en primera carga** de dashboard, customers, agenda, cash e inventory. La pantalla ya no se ve vacia; se ve la forma del contenido cargando.
- **Stale-while-revalidate**: al cambiar fecha o seccion, los datos previos quedan visibles y un badge `Actualizando` confirma que viene refresh.
- **Auto-refetch del dashboard al cambiar fechas** con debounce 400ms. Antes habia que tocar el boton "Ver periodo"; ahora actualiza solo.
- **Prefetch on hover** sobre items del sidebar: pasar el mouse arranca la request, asi el click siguiente suele encontrar los datos cacheados.
- **Optimistic update en cambio de estado de work order** desde el menu de agenda: el estado se ve actualizado al instante; si falla, rollback automatico.

## Cambio invisible (frontend tooling)

- `apiFetch` acepta `AbortSignal`; cancela requests de seccion vieja al cambiar.
- Dedup de GETs identicos en vuelo (cambio rapido de seccion no genera N requests).
- `apiPage<T>` helper para callers que quieran paginacion real (no usado aun; queda para iteracion futura).
- `loadData` usa `loadingDataSets: Set<DataSetKey>` en lugar de `loading: boolean` global → loading granular por panel.
- Avatares + logo del sidebar migrados a `next/image unoptimized loading="lazy"`.
- Hook `usePendingActions` y helper `runOptimistic` disponibles para futuras migraciones.
- Componentes `<Button>` y `<Skeleton*>` agregados a `frontend/app/components/ui/`.

## Cambio en backend

- 5 indices compuestos Postgres en `(business, fecha)`:
  - WorkOrder, Reservation (con status), Payment, CashMovement, MaterialConsumption.
- `Cache-Control: private, max-age=60` en `/auth/me/` y `max-age=300` en `/settings/business-profile/`. Frontend opt-in con `cache: 'default'` en los call sites.
- `CONN_MAX_AGE=300` + `CONN_HEALTH_CHECKS=True` en `settings_production.py`: Django reusa conexion Postgres entre requests mientras Vercel mantiene el contenedor. Ambos via env si hace falta tunear.
- Documentado en `docs/deployment/supabase.md` el upgrade path al transaction pooler de Supabase.

## Archivos clave modificados

- Frontend primitives: `frontend/app/components/ui/Button.tsx`, `Skeleton.tsx` + tests.
- Hook: `frontend/lib/page-support.tsx` (`usePendingActions`).
- Cliente HTTP: `frontend/lib/api.ts` (signal + dedup + `apiPage`).
- Orquestador: `frontend/app/page.tsx` (loadingDataSets, runOptimistic, prefetchSection, schedulePeriodReload, NextImage, skeletons en CustomerList e InventoryPanel wrap).
- Forms: 10 en `frontend/app/components/forms/*` con `submitting` prop.
- Paneles: `dashboard/DashboardPanel.tsx`, `cash/CashPanel.tsx`.
- Sidebar: `layout/SidebarNav.tsx` (onItemHover).
- Estilos: `app/styles/base.css` (Button + Skeleton CSS), `app/styles/shell.css` (badge + grids).
- Backend: 4 migrations nuevas (workorders, scheduling, finance, inventory), `config/views.py` (Cache-Control), `config/settings_production.py` (conn_max_age).

## Decisiones

- **No** se aplica optimistic a stock, caja, payments ni debts; son side effects sensibles donde el pesimista es mas seguro.
- Una key por form en `usePendingActions` (sin id): solo hay un modal por tipo a la vez. Si en el futuro se permite edicion concurrente (inline en listas), las keys se extenderan a `save:customer:${id}`.
- Cache HTTP solo en `/auth/me/` y `/settings/business-profile/`. Catalogos mutables (`/services/`, `/materials/`) quedan para una iteracion donde se resuelva la invalidacion automatica.
- `unoptimized` en `next/image` evita consumir invocations del optimizer de Vercel en free tier.
- Virtualizacion de listas y migracion a SWR/React Query quedan EXPLICITAMENTE fuera del scope para mantener el diff acotado. Si la UX no alcanza, se evaluan despues.

## Validacion

- Backend: `py -3 -m pytest tests` → 235 passed.
- Frontend: `tsc --noEmit` verde + `vitest run` ~39 casos UI verdes.
- Sanity manual sobre throttle Slow 3G: bloqueo de botones, skeletons en primera carga, datos viejos visibles mientras llega nuevo, badge "Actualizando" al cambiar fechas.
