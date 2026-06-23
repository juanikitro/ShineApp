# Estado del frontend con TanStack Query (server-state) + Context (UI)

## Contexto

`frontend/app/page.tsx` es un god component: un unico `Home()` de ~14.000
lineas con 127 `useState`, 27 `useEffect` y 0 `useCallback`. La mayoria de
ese estado son ~25 colecciones que en realidad son **server-state**
(`customers`, `vehicles`, `reservations`, `workOrders`, `payments`, `debts`,
`materials`, `quotes`, `tasks`, etc.), cargadas a mano con `useEffect` +
`apiFetch`, sin cache, sin dedupe y sin una estrategia coherente de refetch
o invalidacion tras mutaciones.

Esto es el nucleo del problema de mantenibilidad: el estado y su sincronizacion
con el backend estan entrelazados con el render, lo que hace imposible extraer
secciones del god component sin desarmar primero la carga de datos.

## Decision

- **Server-state con `@tanstack/react-query`.** Cada coleccion se modela como
  un `useQuery` tipado con una query key por dominio; las escrituras usan
  `useMutation` con invalidacion explicita de las keys afectadas.
- **UI-state con React nativo (Context + `useReducer`).** El estado efimero de
  interfaz (seccion activa, modales, filtros, formularios) vive en contexts
  acotados por dominio, no en 127 `useState` planos.
- Los hooks de query/mutation viven en `frontend/lib/api/` (o `lib/queries/`)
  y consumen el cliente tipado (ver
  [tipos desde OpenAPI](2026-06-12-tipos-desde-openapi.md)).

## Alternativas consideradas

- **Zustand**: store client-side liviano. Reemplaza los `useState` pero **no**
  resuelve cache/refetch/invalidacion de server-state; seguiriamos escribiendo
  los `useEffect` de carga a mano.
- **Redux Toolkit + RTK Query**: cubre server-state pero agrega mas peso y
  boilerplate del que el proyecto necesita.
- **SWR**: valido y liviano, pero TanStack Query ofrece mutaciones,
  invalidacion y devtools mas completos para este caso.
- **Solo React nativo**: cero dependencias, pero reimplementariamos a mano lo
  que React Query ya resuelve (dedupe, cache, estados de carga/error).

## Consecuencias

- +1 dependencia madura (`@tanstack/react-query`).
- Se eliminan ~los 27 `useEffect` de carga a medida que se migra cada coleccion.
- Cache, dedupe, refetch e invalidacion quedan centralizados y testeables por hook.
- Habilita la decomposicion del god component (Track F del plan): cada seccion
  pasa a un container que consume hooks de query en lugar de estado heredado.

## Validacion esperada

- Cada coleccion migrada borra su `useEffect` de carga correspondiente.
- El E2E del flujo afectado queda verde (ver
  [red E2E](2026-06-12-red-e2e-playwright.md)).
- `npm run typecheck` sin nuevos `any`; los hooks devuelven tipos generados.
