# Plan De Implementacion: UX Para Infraestructura Lenta

> **Workers agenticos:** este plan se ejecuta tarea por tarea con checkboxes (`- [ ]`). Cada tarea define archivos, snippets y un check de validacion. Marca `- [x]` al cerrar cada paso y commitea por unidad coherente. Lee primero `AGENTS.md` y `docs/ia/TESTING.md#restriccion-de-recursos-frontend`.

**Objetivo:** mejorar la UX de ShineApp dado que la infraestructura (Vercel free + Supabase free) es lenta. La app no puede ir mas rapido en origen, pero puede dejar de **sentirse** lenta: bloquear botones mientras hay request en vuelo, mostrar feedback granular donde esta cargando, evitar pantalla "vacia" con skeletons, mantener datos viejos visibles mientras llegan los nuevos, y reducir round trips inutiles.

**Alcance del PR unico:** Fases 1, 2 y 4 completas + Fase 3.2 (`next/image` para avatares). Excluido del PR: Fase 3.1 (virtualizacion) y 3.3 (SWR/React Query) — son refactors arquitectonicos grandes que violan "diffs chicos" y se evaluaran despues si las fases incluidas no alcanzan.

**Arquitectura:** cambios localizados en `frontend/lib/api.ts`, `frontend/lib/page-support.tsx`, `frontend/app/page.tsx`, `frontend/app/components/ui/*`, `frontend/app/styles/*.css`, mas una migration Django y prefetches en views existentes. Sin librerias nuevas, sin cambios de contratos publicos.

**Tech Stack:** Next.js App Router (React 19, TypeScript), Django + DRF, Postgres (Supabase free), CSS partials globales.

---

## Restricciones

- Sin librerias externas nuevas (no SWR, no React Query, no react-virtuoso). El cache, dedup y abort se implementan a mano sobre `apiFetch`.
- Sin cambios a contratos publicos de la API. Si un endpoint cambia su shape de respuesta, justificar y cubrir consumidor.
- No paralelizar comandos frontend (Vitest, build, dev server). Leer `docs/ia/TESTING.md#restriccion-de-recursos-frontend` antes de validar.
- Optimistic updates solo en mutaciones seguras. Stock, caja, payments y debts mantienen flujo actual (pesimista con boton bloqueado).
- Preservar accesibilidad: `aria-busy`, `aria-live`, foco visible, teclado, contraste.
- Mantener default visual CRM claro y la variante dark navy soportada.
- Si una tarea backend necesita migration nueva, usar nombre incremental y revisar `backend/*/migrations/` antes.

---

## Estructura De Archivos

### Frontend - Modificar

- `frontend/lib/api.ts`
  Responsabilidad: aceptar `AbortSignal`, dedup de GETs en vuelo, helper `apiPage<T>(path, opts)` para paginacion real.

- `frontend/lib/page-support.tsx`
  Responsabilidad: helpers compartidos. Aqui vive `useRunAction` y tipos relacionados.

- `frontend/lib/app-data.ts`
  Responsabilidad: aceptar `signal` para cancelar fetches en vuelo cuando cambia scope.

- `frontend/app/page.tsx`
  Responsabilidad: reemplazar `runAction` por `useRunAction`, mover `loading: boolean` a `loadingKeys: Set<DataSetKey>`, agregar `period` al `useEffect` deps, debounce del filtro de periodo, prefetch on hover, stale-while-revalidate.

- `frontend/app/styles/base.css`
  Responsabilidad: estilos del nuevo `<Button>` reutilizable (estados loading/disabled), `aria-busy` visible.

- `frontend/app/styles/shell.css`
  Responsabilidad: overlay "Actualizando..." y estilos de panel stale.

### Frontend - Crear

- `frontend/app/components/ui/Button.tsx`
  Responsabilidad: boton reutilizable con `loading`, `variant`, `size`, `disabled`. Mientras `loading=true`: `disabled`, `aria-busy`, spinner inline.

- `frontend/app/components/ui/Skeleton.tsx`
  Responsabilidad: primitives `<SkeletonLine>`, `<SkeletonCard>`, `<SkeletonRow>`, `<SkeletonMetric>` CSS-only.

- `frontend/app/components/ui/Button.test.tsx`
- `frontend/app/components/ui/Skeleton.test.tsx`
- `frontend/lib/use-run-action.test.tsx`

### Backend - Modificar

- `backend/customers/views.py`
  Responsabilidad: prefetch en `history` y `build_customer_list_insights` para eliminar N+1.

- `backend/dashboard/views.py`
  Responsabilidad: prefetch consistente en `work_order_financials`.

- `backend/config/settings_production.py`
  Responsabilidad: subir `conn_max_age` para reusar conexion Postgres entre requests cuando Vercel reusa el contenedor.

- `backend/scheduling/views.py`, `backend/workorders/views.py`, `backend/finance/views.py`
  Responsabilidad: agregar `Cache-Control` en endpoints semi-estaticos sin reducir frescura de datos sensibles.

### Backend - Crear

- `backend/workorders/migrations/00XX_add_business_created_at_index.py`
  Responsabilidad: indices compuestos en tablas con queries hot.

### Docs - Crear

- `docs/registro/cambios/2026-06-05-ux-infra-lenta.md`
  Responsabilidad: registro spec-as-source del cambio funcional visible.

---

## Tarea 1: Cliente HTTP Con Abort Y Dedup

**Archivos:**
- Modificar: `frontend/lib/api.ts`

- [ ] **Paso 1: Aceptar `AbortSignal` en `apiFetch` y `publicApiFetch`**

`apiFetch` ya recibe `RequestInit` pero no lo documenta; agregar tipos explicitos y pasar `signal` a `fetch`. No cambia comportamiento existente.

```ts
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (token) {
    headers.set("Authorization", `Token ${token}`)
  }

  const response = await fetch(apiRequestUrl(path), {
    ...options,
    headers,
    cache: "no-store",
    signal: options.signal,
  })

  if (!response.ok) {
    raiseApiError(response, await readErrorPayload(response))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
```

- [ ] **Paso 2: Dedup de GETs identicos en vuelo**

Un `Map<string, Promise>` por key (`method:url`). Si llega un GET identico mientras hay uno en vuelo, reusar la promise.

```ts
const inflight = new Map<string, Promise<unknown>>()

function inflightKey(path: string, options: RequestInit) {
  const method = (options.method ?? "GET").toUpperCase()
  return `${method}:${apiRequestUrl(path)}`
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase()
  if (method !== "GET") {
    return doFetch<T>(path, options)
  }
  const key = inflightKey(path, options)
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const promise = doFetch<T>(path, options).finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

async function doFetch<T>(path: string, options: RequestInit & { signal?: AbortSignal }): Promise<T> {
  // cuerpo actual de apiFetch
}
```

- [ ] **Paso 3: `apiList` y `apiPage` separados**

`apiList` actual recorre `while (next)` y trae TODO, neutralizando paginacion DRF. Mantenerlo para no romper consumidores, pero exponer `apiPage` para casos que quieran una pagina sola.

```ts
export type ApiPage<T> = {
  results: T[]
  next: string | null
  previous: string | null
  count?: number
}

export async function apiPage<T>(
  path: string,
  options: RequestInit & { signal?: AbortSignal } = {},
): Promise<ApiPage<T>> {
  const payload = await apiFetch<T[] | PaginatedPayload<T>>(path, options)
  if (Array.isArray(payload)) {
    return { results: payload, next: null, previous: null }
  }
  return {
    results: Array.isArray(payload.results) ? payload.results : [],
    next: payload.next ?? null,
    previous: (payload as any).previous ?? null,
    count: (payload as any).count,
  }
}
```

- [ ] **Paso 4: Validacion**

```powershell
cd frontend
npx vitest run lib/api
```

Esperado: tests previos siguen verdes (si no hay tests, ejecutar `npm run build` para verificar tipos).

---

## Tarea 2: `useRunAction` Con Estado Pending

**Archivos:**
- Modificar: `frontend/lib/page-support.tsx`
- Crear: `frontend/lib/use-run-action.test.tsx`

- [ ] **Paso 1: Definir hook con estado pending granular**

```ts
import { useCallback, useRef, useState } from 'react'

export type RunActionOptions<T> = {
  flashTarget?: string | ((result: T) => string | null | undefined)
  successTitle?: string | ((result: T) => string | undefined)
  successDescription?: string | ((result: T) => string | undefined)
  undo?: UndoAction<T>
  key?: string
}

export type UseRunActionApi = {
  run: <T>(action: () => Promise<T>, options?: RunActionOptions<T>) => Promise<T | undefined>
  pending: boolean
  pendingKeys: ReadonlySet<string>
  isPending: (key: string) => boolean
}

export function useRunAction(handlers: {
  setError: (notice: ErrorNotice | null) => void
  reload: (options?: { force?: boolean }) => Promise<void>
  flash: (target: string | null) => void
  registerUndoAction: <T>(result: T, undo: UndoAction<T>, title: string, description?: string) => void
  clearPendingUndo: () => void
  showToast: (toast: Toast) => void
  resolveActionMessage: <T>(message: unknown, result: T) => string | undefined
  successToastDescription: (title: string) => string
}): UseRunActionApi {
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set())
  const counterRef = useRef(0)

  const run = useCallback(async <T,>(
    action: () => Promise<T>,
    options?: RunActionOptions<T>,
  ): Promise<T | undefined> => {
    const key = options?.key ?? `runAction:${++counterRef.current}`
    setPendingKeys((prev) => new Set([...prev, key]))
    handlers.setError(null)
    try {
      const result = await action()
      await handlers.reload({ force: true })
      const target = typeof options?.flashTarget === 'function'
        ? options.flashTarget(result)
        : options?.flashTarget
      handlers.flash(target ?? null)
      const successTitle = handlers.resolveActionMessage(options?.successTitle, result)
        ?? (target ? 'Cambio guardado' : null)
      if (successTitle) {
        const successDescription = handlers.resolveActionMessage(options?.successDescription, result)
          ?? handlers.successToastDescription(successTitle)
        if (options?.undo) {
          handlers.registerUndoAction(result, options.undo, successTitle, successDescription)
        } else {
          handlers.clearPendingUndo()
          handlers.showToast({ tone: 'success', title: successTitle, description: successDescription })
        }
      } else {
        handlers.clearPendingUndo()
      }
      return result
    } catch (err: any) {
      handlers.setError(formatApiError(err))
      return undefined
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [handlers])

  return {
    run,
    pending: pendingKeys.size > 0,
    pendingKeys,
    isPending: useCallback((key: string) => pendingKeys.has(key), [pendingKeys]),
  }
}
```

- [ ] **Paso 2: Tests basicos**

```tsx
// frontend/lib/use-run-action.test.tsx
import { renderHook, act } from '@testing-library/react'
import { useRunAction } from './page-support'

it('marca pending mientras corre y libera al finalizar', async () => {
  const handlers = mockHandlers()
  const { result } = renderHook(() => useRunAction(handlers))
  let resolve!: () => void
  const promise = new Promise<void>((r) => { resolve = r })
  let runPromise!: Promise<unknown>
  act(() => {
    runPromise = result.current.run(() => promise.then(() => ({ id: 1 })), { key: 'save' })
  })
  expect(result.current.isPending('save')).toBe(true)
  await act(async () => { resolve(); await runPromise })
  expect(result.current.isPending('save')).toBe(false)
})

it('libera pending si la mutacion arroja', async () => { /* ... */ })
it('llama reload con force tras exito', async () => { /* ... */ })
```

- [ ] **Paso 3: Validacion**

```powershell
cd frontend
npx vitest run lib/use-run-action
```

---

## Tarea 3: Componente `<Button>` Reutilizable

**Archivos:**
- Crear: `frontend/app/components/ui/Button.tsx`
- Crear: `frontend/app/components/ui/Button.test.tsx`
- Modificar: `frontend/app/styles/base.css`

- [ ] **Paso 1: Componente Button**

```tsx
// frontend/app/components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'destructive' | 'subtle'
type Size = 'sm' | 'md'

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    type = 'button',
    className,
    children,
    leadingIcon,
    trailingIcon,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading
  const classes = [
    variant,
    size === 'sm' && 'button-sm',
    loading && 'is-loading',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      {...rest}
    >
      {loading ? <span className="button-spinner" aria-hidden="true" /> : leadingIcon}
      <span className="button-label">{children}</span>
      {!loading ? trailingIcon : null}
    </button>
  )
})
```

- [ ] **Paso 2: Estilos del Button y spinner**

```css
/* frontend/app/styles/base.css - agregar al final */
button.is-loading {
  cursor: progress;
  position: relative;
}

button[aria-busy="true"] {
  pointer-events: none;
}

.button-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: button-spin 0.7s linear infinite;
  margin-right: 6px;
  vertical-align: -2px;
}

@keyframes button-spin {
  to { transform: rotate(360deg); }
}

button.button-sm {
  padding: 4px 8px;
  font-size: 0.85rem;
}

.button-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
```

- [ ] **Paso 3: Tests**

```tsx
// frontend/app/components/ui/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('aplica disabled y aria-busy cuando loading', () => {
    render(<Button loading>Guardar</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('no muestra leadingIcon mientras loading', () => {
    render(<Button loading leadingIcon={<span data-testid="icon" />}>X</Button>)
    expect(screen.queryByTestId('icon')).toBeNull()
  })

  it('respeta variant via className', () => {
    render(<Button variant="destructive">Borrar</Button>)
    expect(screen.getByRole('button').className).toContain('destructive')
  })
})
```

- [ ] **Paso 4: Validacion**

```powershell
cd frontend
npx vitest run app/components/ui/Button
```

---

## Tarea 4: Skeletons Para Listas Y Metricas

**Archivos:**
- Crear: `frontend/app/components/ui/Skeleton.tsx`
- Crear: `frontend/app/components/ui/Skeleton.test.tsx`
- Modificar: `frontend/app/styles/base.css`

- [ ] **Paso 1: Componentes Skeleton**

```tsx
// frontend/app/components/ui/Skeleton.tsx
import { CSSProperties } from 'react'

type Common = { className?: string; style?: CSSProperties }

export function SkeletonLine({ width = '100%', height = 12, className, style }: Common & { width?: string | number; height?: string | number }) {
  const w = typeof width === 'number' ? `${width}px` : width
  const h = typeof height === 'number' ? `${height}px` : height
  return <span className={`skeleton skeleton-line ${className ?? ''}`} style={{ width: w, height: h, ...style }} aria-hidden="true" />
}

export function SkeletonCard({ lines = 3, className }: Common & { lines?: number }) {
  return (
    <div className={`skeleton-card ${className ?? ''}`} aria-hidden="true">
      <SkeletonLine width="40%" height={14} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={`${60 + ((i * 17) % 35)}%`} />
      ))}
    </div>
  )
}

export function SkeletonRow({ columns = 4, className }: Common & { columns?: number }) {
  return (
    <div className={`skeleton-row ${className ?? ''}`} aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonLine key={i} width={`${100 / columns - 4}%`} />
      ))}
    </div>
  )
}

export function SkeletonMetric({ className }: Common) {
  return (
    <div className={`skeleton-metric ${className ?? ''}`} aria-hidden="true">
      <SkeletonLine width="50%" height={10} />
      <SkeletonLine width="70%" height={22} />
    </div>
  )
}

export function SkeletonList({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="skeleton-list" role="status" aria-label="Cargando" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} columns={columns} />
      ))}
    </div>
  )
}
```

- [ ] **Paso 2: Estilos shimmer**

```css
/* frontend/app/styles/base.css - agregar */
.skeleton {
  display: inline-block;
  background: linear-gradient(90deg,
    var(--skeleton-base, #e5e7eb) 0%,
    var(--skeleton-highlight, #f3f4f6) 50%,
    var(--skeleton-base, #e5e7eb) 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}

[data-theme="dark"] .skeleton {
  --skeleton-base: #1f2937;
  --skeleton-highlight: #2d3748;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-card { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
.skeleton-row { display: flex; gap: 12px; padding: 8px 0; }
.skeleton-list { display: flex; flex-direction: column; gap: 4px; }
.skeleton-metric { display: flex; flex-direction: column; gap: 6px; padding: 8px; }
```

- [ ] **Paso 3: Tests minimos**

```tsx
import { render, screen } from '@testing-library/react'
import { SkeletonList, SkeletonCard } from './Skeleton'

it('SkeletonList expone status para SR', () => {
  render(<SkeletonList rows={3} columns={2} />)
  expect(screen.getByRole('status')).toBeTruthy()
})

it('SkeletonCard renderiza la cantidad de lineas pedida', () => {
  const { container } = render(<SkeletonCard lines={5} />)
  // 1 titulo + 5 lineas
  expect(container.querySelectorAll('.skeleton-line').length).toBe(6)
})
```

- [ ] **Paso 4: Validacion**

```powershell
cd frontend
npx vitest run app/components/ui/Skeleton
```

---

## Tarea 5: Loading Granular Y Stale-While-Revalidate En `loadData`

**Archivos:**
- Modificar: `frontend/app/page.tsx`
- Modificar: `frontend/lib/app-data.ts`

- [ ] **Paso 1: Tipo `LoadingState` por dataset**

En `frontend/app/page.tsx`, reemplazar `const [loading, setLoading] = useState(false)` por:

```ts
const [loadingDataSets, setLoadingDataSets] = useState<ReadonlySet<DataSetKey>>(new Set())
const [loading, setLoading] = useState(false) // mantener para flujos NO loadData (login, audit log)

function isDataSetLoading(key: DataSetKey) {
  return loadingDataSets.has(key)
}
```

- [ ] **Paso 2: `loadData` marca/libera por key**

```ts
const loadDataAbortRef = useRef<AbortController | null>(null)

async function loadData(options: LoadDataOptions = {}) {
  const dataScope = { period, selectedDay }
  const keys = dataSetKeysForSection({
    section: options.section ?? displayedActive,
    settingsSection: options.settingsSection ?? settingsSection,
    canViewEconomy,
  })
  if (options.force) {
    loadedDataCacheRef.current.clear()
  }
  const keysToLoad = options.force
    ? keys
    : keys.filter((key) => !loadedDataCacheRef.current.has(dataSetCacheKey(key, dataScope)))
  if (!keysToLoad.length) return

  // Cancelar request anterior si quedo en vuelo
  loadDataAbortRef.current?.abort()
  const controller = new AbortController()
  loadDataAbortRef.current = controller

  setLoadingDataSets((prev) => {
    const next = new Set(prev)
    for (const k of keysToLoad) next.add(k)
    return next
  })
  setError(null)
  setAgendaLoadError(null)
  setLoadErrorNotice(null)

  try {
    const entries = await loadAppDataSets(keysToLoad, dataScope, {
      apiFetch: (path, opts) => apiFetch(path, { ...opts, signal: controller.signal }),
      apiList: (path) => apiList(path),
    })
    if (controller.signal.aborted) return
    for (const [key, data] of entries) {
      applyAppDataEntry(key, data, appDataAppliers)
      loadedDataCacheRef.current.add(dataSetCacheKey(key, dataScope))
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return
    const notice = formatApiError(err, {
      fallbackTitle: 'No se pudieron cargar los datos',
      fallbackDescription: 'Actualiza nuevamente o revisa la conexion con el servidor.',
    })
    setAgendaLoadError(notice)
    setLoadErrorNotice(notice)
    setError(notice)
  } finally {
    if (loadDataAbortRef.current === controller) {
      loadDataAbortRef.current = null
    }
    setLoadingDataSets((prev) => {
      const next = new Set(prev)
      for (const k of keysToLoad) next.delete(k)
      return next
    })
  }
}
```

- [ ] **Paso 3: Stale-while-revalidate — no vaciar datos al cambiar scope**

El `useEffect` actual ([page.tsx:2122-2126](frontend/app/page.tsx)) ya no resetea state previo; sigue mostrando datos viejos hasta que llegan nuevos. **Agregar `period` a deps** (gap del diagnostico):

```ts
useEffect(() => {
  if (token && currentUser) {
    loadData()
  }
}, [currentUser, displayedActive, selectedDay, settingsSection, token, period.from, period.to])
```

- [ ] **Paso 4: Validacion**

```powershell
cd frontend
npm run build
```

Esperado: build pasa.

---

## Tarea 6: Migrar Formularios Criticos A `useRunAction` + `<Button loading>`

**Archivos:**
- Modificar: `frontend/app/page.tsx`

- [ ] **Paso 1: Instanciar `useRunAction` en `Home`**

Reemplazar la funcion `runAction` actual ([page.tsx:3328](frontend/app/page.tsx:3328)) por:

```ts
const runActionApi = useRunAction({
  setError,
  reload: loadData,
  flash,
  registerUndoAction,
  clearPendingUndo,
  showToast,
  resolveActionMessage,
  successToastDescription,
})
const runAction = runActionApi.run
const isActionPending = runActionApi.isPending
```

- [ ] **Paso 2: Pasar `key` a los `runAction` criticos**

Para cada formulario critico, dar key unico:

| Handler | Key sugerido |
|---|---|
| `saveCustomer` | `save:customer:${id ?? 'new'}` |
| `saveVehicle` | `save:vehicle:${id ?? 'new'}` |
| `saveReservation` | `save:reservation:${id ?? 'new'}` |
| `savePayment` | `save:payment` |
| `saveCashMovement` | `save:cash` |
| `saveDebt` | `save:debt:${id ?? 'new'}` |
| `saveMaterial` | `save:material:${id ?? 'new'}` |
| `saveSupplier` | `save:supplier:${id ?? 'new'}` |
| `saveStockMovement` | `save:stock` |
| `saveQuote` | `save:quote:${id ?? 'new'}` |

Ejemplo de migracion (`saveCustomer`):

```ts
async function saveCustomer(event: FormEvent) {
  event.preventDefault()
  const currentId = customerForm.id
  const key = `save:customer:${currentId || 'new'}`
  // ... resto igual, agregar `key` en options
  await runAction(async () => { /* ... */ }, {
    key,
    flashTarget: (saved: AnyRecord) => recordFlashKey('customer', saved?.id ?? currentId),
    successTitle: entityFeedbackTitle('customer', currentId ? 'updated' : 'created'),
    undo: /* ... */,
  })
}
```

- [ ] **Paso 3: Reemplazar `<button className="primary" type="submit">` por `<Button loading>` en formularios criticos**

Importar el componente:

```ts
import { Button } from './components/ui/Button'
```

Localizar los `<button type="submit">` dentro de `CustomerForm`, `VehicleForm`, `ReservationForm`, `PaymentForm`, `CashMovementForm`, `DebtForm`, `MaterialForm`, `SupplierForm`, `StockMovementForm`, `QuoteForm` y migrarlos. Estos forms reciben `loading` o pueden recibir `submitting` por prop. Patron:

```tsx
<Button
  type="submit"
  variant="primary"
  loading={isActionPending(`save:customer:${customerForm.id || 'new'}`)}
>
  Guardar
</Button>
```

Donde el form viva como componente separado (e.g. `CustomerForm`), pasar `submitting={isActionPending(...)}` como prop nueva y usarla dentro.

- [ ] **Paso 4: Botones de borrado y toggle**

Para botones DELETE y de cambio de estado (`runAction(() => apiFetch(path, { method: 'DELETE' }))`), pasar `key: 'delete:customer:${id}'` y usar `<Button loading={...}>`.

- [ ] **Paso 5: Validacion**

```powershell
cd frontend
npm run build
```

Esperado: build pasa, sin errores TS.

---

## Tarea 7: Auto-Refetch De Periodo En Dashboard

**Archivos:**
- Modificar: `frontend/app/page.tsx`

- [ ] **Paso 1: Debounce del filtro de periodo**

Reemplazar el `<form onSubmit={...}>` actual ([page.tsx:11565-11595](frontend/app/page.tsx:11565)) por inputs con debounce. Mantener el boton "Ver periodo" como fallback accesible (Enter / boton).

```tsx
const periodChangeTimeoutRef = useRef<number | null>(null)

function schedulePeriodReload(next: { from: string; to: string }) {
  setPeriod(next)
  if (periodChangeTimeoutRef.current) window.clearTimeout(periodChangeTimeoutRef.current)
  periodChangeTimeoutRef.current = window.setTimeout(() => {
    loadData({ force: true, section: 'dashboard' })
  }, 400)
}

useEffect(() => () => {
  if (periodChangeTimeoutRef.current) window.clearTimeout(periodChangeTimeoutRef.current)
}, [])
```

Cambiar JSX:

```tsx
<input
  type="date"
  value={period.from}
  onChange={(event) => schedulePeriodReload({ ...period, from: event.target.value })}
/>
```

- [ ] **Paso 2: Indicador de stale mientras refresca**

En el panel de dashboard, si `isDataSetLoading('dashboard')`, mostrar badge sutil "Actualizando..." en la esquina del panel (sin tapar contenido). Patron CSS:

```css
/* frontend/app/styles/shell.css */
.panel-stale-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  background: var(--panel-muted);
  border-radius: 999px;
}
.panel-stale-badge::before {
  content: '';
  width: 8px;
  height: 8px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: button-spin 0.7s linear infinite;
}
```

Y en JSX donde se renderiza el dashboard:

```tsx
{isDataSetLoading('dashboard') ? <span className="panel-stale-badge">Actualizando</span> : null}
```

- [ ] **Paso 3: Validacion**

```powershell
cd frontend
npm run build
```

---

## Tarea 8: Skeletons En Vistas Clave

**Archivos:**
- Modificar: `frontend/app/page.tsx`

- [ ] **Paso 1: Dashboard inicial con SkeletonMetric**

En la seccion `dashboard`, cuando `!dashboard && isDataSetLoading('dashboard')` (primera carga, sin datos viejos), renderizar:

```tsx
{!dashboard && isDataSetLoading('dashboard') ? (
  <div className="dashboard-metrics-grid">
    {Array.from({ length: 6 }).map((_, i) => <SkeletonMetric key={i} />)}
  </div>
) : (
  // contenido existente
)}
```

- [ ] **Paso 2: CustomerListPanel con SkeletonList**

```tsx
{!customers.length && isDataSetLoading('customers') ? (
  <SkeletonList rows={8} columns={3} />
) : (
  // contenido existente
)}
```

- [ ] **Paso 3: AgendaPanel con skeleton de tarjetas**

```tsx
{!reservations.length && isDataSetLoading('reservations') ? (
  <div className="agenda-skeleton">
    {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
  </div>
) : (
  // contenido existente
)}
```

- [ ] **Paso 4: CashPanel con SkeletonList**

Mismo patron en `cash`.

- [ ] **Paso 5: InventoryPanel con SkeletonList**

Mismo patron en materiales/stock.

- [ ] **Paso 6: Validacion**

```powershell
cd frontend
npm run build
```

---

## Tarea 9: Prefetch Al Hover De La Sidebar

**Archivos:**
- Modificar: `frontend/app/page.tsx`
- Modificar (si existe): `frontend/app/components/layout/SidebarNav.tsx`

- [ ] **Paso 1: Handler `prefetchSection`**

```ts
const prefetchedSectionsRef = useRef<Set<Section>>(new Set())

function prefetchSection(section: Section) {
  if (prefetchedSectionsRef.current.has(section)) return
  prefetchedSectionsRef.current.add(section)
  loadData({ section }) // sin force, respeta cache
}
```

- [ ] **Paso 2: Pasar handler a `SidebarNav` y aplicar `onMouseEnter`**

En `SidebarNav`, agregar `onItemHover?: (key: string) => void` y disparar:

```tsx
<button
  key={item.key}
  onMouseEnter={() => onItemHover?.(item.key)}
  onFocus={() => onItemHover?.(item.key)}
  onClick={() => onChange(item.key)}
>
```

En `page.tsx`:

```tsx
<SidebarNav
  onItemHover={(key) => prefetchSection(key as Section)}
  // ... resto
/>
```

- [ ] **Paso 3: Validacion**

```powershell
cd frontend
npm run build
```

---

## Tarea 10: Optimistic Updates Selectivos

**Archivos:**
- Modificar: `frontend/app/page.tsx`

Aplicar **solo** a mutaciones seguras: toggle de estado de work order, edit de campos no sensibles (notas, color de vehiculo, prioridad de reserva). **NO** aplicar a stock, payments, cash, debts.

- [ ] **Paso 1: Helper `runOptimistic`**

```ts
async function runOptimistic<T>(args: {
  key: string
  optimistic: () => void
  rollback: () => void
  action: () => Promise<T>
  successTitle?: string
}): Promise<T | undefined> {
  args.optimistic()
  try {
    const result = await runAction(args.action, { key: args.key, successTitle: args.successTitle })
    return result
  } catch (err) {
    args.rollback()
    throw err
  }
}
```

- [ ] **Paso 2: Aplicar a `setWorkOrderStatus`**

Localizar el handler que hace `PATCH /work-orders/{id}/status/` y envolver:

```ts
async function setWorkOrderStatus(orderId: string, status: string) {
  const previous = workOrders.find((w) => String(w.id) === String(orderId))
  if (!previous) return
  await runOptimistic({
    key: `wo-status:${orderId}`,
    optimistic: () => setWorkOrders((prev) => prev.map((w) =>
      String(w.id) === String(orderId) ? { ...w, status } : w)),
    rollback: () => setWorkOrders((prev) => prev.map((w) =>
      String(w.id) === String(orderId) ? previous : w)),
    action: () => apiFetch(`/work-orders/${orderId}/status/`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
    successTitle: 'Estado actualizado',
  })
}
```

- [ ] **Paso 3: Validacion**

```powershell
cd frontend
npm run build
```

---

## Tarea 11: `next/image` Para Avatares Y Logos

**Archivos:**
- Modificar: `frontend/app/page.tsx`

- [ ] **Paso 1: Reemplazar `<img>` por `<Image>` con `loading="lazy"`**

Localizar el avatar del sidebar ([page.tsx:11501-11509](frontend/app/page.tsx:11501)) y migrarlo:

```tsx
import Image from 'next/image'

{safeSidebarAvatarUrl && !sidebarAvatarIsPdf ? (
  <Image
    src={safeSidebarAvatarUrl}
    alt=""
    width={32}
    height={32}
    loading="lazy"
    unoptimized // Supabase Storage no necesita el optimizer de Vercel
  />
) : null}
```

`unoptimized` evita que Vercel intente optimizar URLs externas (consume invocations en free tier).

- [ ] **Paso 2: Configurar dominios Supabase en `next.config`**

Si el archivo `frontend/next.config.*` define `images.remotePatterns`, agregar el host Supabase usado. Si `unoptimized` ya esta seteado por imagen, este paso es opcional.

- [ ] **Paso 3: Validacion**

```powershell
cd frontend
npm run build
```

---

## Tarea 12: Indices Postgres Para Queries Hot

**Archivos:**
- Crear: `backend/workorders/migrations/00XX_indexes_business_dates.py` (numero incremental real)
- Posiblemente: nuevas migrations chicas en `scheduling/`, `finance/`, `inventory/`

Antes de crear las migrations, listar las ultimas:

```powershell
ls backend/workorders/migrations
ls backend/scheduling/migrations
ls backend/finance/migrations
ls backend/inventory/migrations
```

- [ ] **Paso 1: Indice `(business, created_at)` en WorkOrder**

Crear migration usando `migrations.AddIndex`:

```python
# backend/workorders/migrations/00XX_indexes_business_dates.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('workorders', '<ultima migration real>'),
    ]
    operations = [
        migrations.AddIndex(
            model_name='workorder',
            index=models.Index(fields=['business', '-created_at'], name='wo_biz_created_idx'),
        ),
    ]
```

- [ ] **Paso 2: Indice `(business, day, status)` en Reservation**

Misma estructura en `scheduling/migrations/`.

- [ ] **Paso 3: Indice `(business, paid_at)` en Payment**

Misma estructura en `finance/migrations/`.

- [ ] **Paso 4: Indice `(business, occurred_at)` en CashMovement**

Misma estructura en `finance/migrations/`.

- [ ] **Paso 5: Indice `(business, consumed_at)` en MaterialConsumption**

Misma estructura en `inventory/migrations/`.

- [ ] **Paso 6: Validacion**

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py migrate --plan
.\.venv\Scripts\python.exe -m pytest -q
```

Esperado: migrations bien definidas, tests pasan.

---

## Tarea 13: Eliminar N+1 En Customers Y Dashboard

**Archivos:**
- Modificar: `backend/customers/views.py`
- Modificar: `backend/dashboard/views.py`

- [ ] **Paso 1: `customers/views.py:281` (`history`)**

Localizar el queryset de WorkOrder en `CustomerViewSet.history`. Agregar prefetches:

```python
work_orders = (
    customer.work_orders
    .select_related('vehicle', 'service')
    .prefetch_related('payments', 'material_consumptions__material')
    .order_by('-created_at')
)
```

- [ ] **Paso 2: `customers/views.py:144` (`build_customer_list_insights`)**

Agregar `select_related('service', 'vehicle')` al queryset antes del loop.

- [ ] **Paso 3: `dashboard/views.py:201` (`work_order_financials`)**

Asegurar que el queryset entrante tenga `select_related('customer', 'vehicle', 'service').prefetch_related('payments', 'material_consumptions__material')` antes del loop.

- [ ] **Paso 4: Validacion**

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q backend/customers backend/dashboard
```

Esperado: tests existentes pasan. Si hay test de N+1 con `assertNumQueries`, ajustar.

---

## Tarea 14: Cache HTTP En Endpoints Semi-Estaticos

**Archivos:**
- Modificar: `backend/auth/views.py` (o donde viva `MeView`)
- Modificar: `backend/settings_app/views.py` (o donde viva `BusinessProfile`)
- Modificar: `backend/services/views.py`, `backend/inventory/views.py`

- [ ] **Paso 1: Decorator `Cache-Control` en `MeView`**

```python
from django.utils.cache import patch_cache_control

def get(self, request, *args, **kwargs):
    response = super().get(request, *args, **kwargs)
    patch_cache_control(response, private=True, max_age=60)
    return response
```

- [ ] **Paso 2: Mismo patron en `BusinessProfile`**

`max_age=300` (5 min) porque cambia rara vez.

- [ ] **Paso 3: Catalogos (`/services/`, `/materials/`)**

`max_age=120`. Invalidar via header en la respuesta de PATCH/POST: enviar `Cache-Control: no-cache` para forzar revalidacion.

- [ ] **Paso 4: Permitir `cache: "default"` en `apiFetch` para estos endpoints**

Agregar opcion `cacheable?: boolean` que omita `cache: "no-store"`:

```ts
const response = await fetch(apiRequestUrl(path), {
  ...options,
  headers,
  cache: (options as any).cache ?? 'no-store',
  signal: options.signal,
})
```

Y en los llamados a estos endpoints, pasar `{ cache: 'default' }`.

- [ ] **Paso 5: Validacion**

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

---

## Tarea 15: Connection Pooling Supabase

**Archivos:**
- Modificar: `backend/config/settings_production.py`

- [ ] **Paso 1: Subir `conn_max_age`**

Localizar la config de DB en `settings_production.py`. Cambiar:

```python
DATABASES['default']['CONN_MAX_AGE'] = 300  # 5 min
DATABASES['default']['CONN_HEALTH_CHECKS'] = True
```

Si Supabase ofrece pooler (puerto 6543 transaction mode), documentar en `docs/deployment/supabase.md` que la URL puede cambiar a pooler para serverless. **No** cambiar la URL sin coordinar con el usuario, solo documentar.

- [ ] **Paso 2: Validacion**

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe -m pytest -q
```

---

## Tarea 16: Registro Spec-As-Source Del Cambio

**Archivos:**
- Crear: `docs/registro/cambios/2026-06-05-ux-infra-lenta.md`

- [ ] **Paso 1: Escribir entrada estilo caveman**

Convencion: cambio funcional visible. Snippets y endpoints exactos.

```md
# UX para infraestructura lenta

Fecha: 2026-06-05

## Cambio

- Botones criticos bloquean mientras hay request en vuelo (anti-double-click).
- Skeletons en dashboard, customers, agenda, cash, inventory mientras carga la primera vez.
- Stale-while-revalidate: cambiar fecha/periodo no vacia la UI; muestra badge "Actualizando".
- Auto-refetch del dashboard al cambiar `period.from`/`period.to` (debounce 400ms).
- Prefetch on hover en sidebar.
- Optimistic update en cambio de estado de work order.
- `apiFetch` con AbortSignal + dedup de GETs en vuelo.
- Indices Postgres en (business, fecha) para WorkOrder, Reservation, Payment, CashMovement, MaterialConsumption.
- Prefetch_related en CustomerViewSet.history y dashboard work_order_financials.
- Cache-Control en /auth/me/, /settings/business-profile/, /services/, /materials/.
- conn_max_age=300 en production.

## Archivos

[Listar archivos modificados con responsabilidad]

## Validacion

- powershell .\scripts\validate.ps1
- npx vitest run app/components/ui frontend/lib/use-run-action
- py -3 -m pytest backend/customers backend/dashboard
```

- [ ] **Paso 2: Regenerar indices de docs**

```powershell
py -3 scripts/check_docs.py --write --skip-build
```

---

## Tarea 17: Validacion Final Y PR

**Archivos:**
- Verificar: todos

- [ ] **Paso 1: Validacion raiz**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

- [ ] **Paso 2: Build frontend (UNA sola vez, sin Node activo en paralelo)**

```powershell
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object { $_.CommandLine -like '*ShineApp*frontend*' } | Select-Object ProcessId,CommandLine
cd frontend
npm run build
```

- [ ] **Paso 3: Smoke test manual con throttle Slow 3G**

Verificar:
- Click en "Guardar" de form → boton se deshabilita y muestra spinner.
- Click rapido x2 → solo dispara 1 POST.
- Cambio de fecha en cash → panel sigue mostrando datos viejos + badge "Actualizando".
- Cambio de seccion mientras carga → no parpadea, datos viejos quedan hasta que llega lo nuevo.
- Primera carga de cada panel → muestra skeleton, no spinner centrado en pantalla vacia.

- [ ] **Paso 4: Commit final y push a la branch del worktree**

```powershell
git status
git diff --stat
git add -A
git commit -m "feat(ux): bloqueo de botones, skeletons, stale-while-revalidate y mejoras de cache/queries"
git push -u origin claude/adoring-taussig-0856fc
```

- [ ] **Paso 5: Crear PR**

Target: confirmar con usuario si va a `development` o `main`. Default: `development` (regla de `AGENTS.md`).

```powershell
gh pr create --base development --title "UX para infraestructura lenta: bloqueo, skeletons, cache, indices" --body "$(cat <<'EOF'
## Resumen

Mejoras de UX dado que la app corre en Vercel free + Supabase free. La infra no cambia; lo que cambia es como se siente la espera.

- Bloqueo de botones criticos mientras hay request en vuelo.
- Skeletons en dashboard, customers, agenda, cash, inventory.
- Stale-while-revalidate al cambiar fecha o seccion (no vacia la UI).
- Auto-refetch del dashboard al cambiar periodo (con debounce).
- Prefetch on hover en sidebar.
- Optimistic update en cambio de estado de work order.
- AbortSignal + dedup en apiFetch.
- Indices Postgres en (business, fecha) en 5 tablas hot.
- Prefetch_related en customers.history y dashboard.
- Cache-Control en endpoints semi-estaticos.
- conn_max_age=300 en production.

Plan: docs/plans/2026-06-05-ux-infra-lenta-implementation-plan.md

## Test plan
- [ ] scripts/validate.ps1 verde
- [ ] npm run build verde
- [ ] vitest sobre Button, Skeleton, useRunAction verde
- [ ] pytest backend verde
- [ ] Smoke Slow 3G: bloqueo, skeletons, stale-while-revalidate

EOF
)"
```

Esperado: PR creado, link devuelto.

---

## Notas Finales

- Si una tarea bloquea (test pre-existente roto, migration falla por dependencia), documentar en el commit y seguir con la siguiente; no romper el orden general.
- Si al implementar Tarea 6 aparece que un form X esta dentro de un componente reusable en `page-support.tsx` o `components/`, migrarlo ahi y dejar `page.tsx` consumiendo el componente actualizado.
- El plan original tenia 3.1 (virtualizacion) y 3.3 (SWR/React Query). Quedan fuera de este PR por scope; pueden ir en un PR separado si la UX no alcanza con las fases incluidas.
