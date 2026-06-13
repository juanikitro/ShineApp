# Plan de refactor de mantenibilidad (2026-06)

Plan vivo de la iniciativa de refactor profundo nacida del audit de calidad
del 2026-06-12. El backend esta sano (tenant-scoping limpio en `core/`,
side-effects transaccionales); el riesgo de mantenibilidad esta concentrado en
el frontend.

## Hallazgos que motivan el plan

- `frontend/app/page.tsx`: god component, ~14.000 lineas, un solo `Home()` con
  127 `useState`, 27 `useEffect`, 0 `useCallback`, 30 closures `render*`.
- `AnyRecord = Record<string, any>` usado ~791 veces: tipado de dominio anulado.
- Sin ESLint / Prettier / ruff ni script de lint: ningun gate freno el crecimiento.
- `frontend/lib/page-support.tsx`: barrel "cajon de sastre" de ~2.164 lineas.
- Motor de stock dentro de `inventory/serializers.py`.
- `config/views.py` mezcla 9 serializers con las views (sin `serializers.py`).

## Decisiones congeladas

- Alcance: refactor profundo (no incremental).
- Estado front: TanStack Query + Context
  (ver decisiones/2026-06-12-estado-frontend-tanstack-query).
- Tipado: generado desde OpenAPI
  (ver decisiones/2026-06-12-tipos-desde-openapi).
- Red anti-regresion: Playwright E2E primero
  (ver decisiones/2026-06-12-red-e2e-playwright).
- Ubicacion de logica backend
  (ver decisiones/2026-06-12-modulos-dominio-vs-serializers).

## Principios

1. Strangler-fig, no big-bang: el god component se vacia seccion por seccion.
2. Behavior-preserving primero: la red E2E captura el comportamiento actual
   antes de mover nada.
3. PRs chicos, validados y reversibles (`AGENTS.md`).
4. Gates con ratchet: los limites entran como baseline (warn/advisory) y se
   endurecen a error al final (Track H).

## Tracks

- **A - Fundaciones**: ESLint + Prettier + ruff, scripts `lint`/`typecheck`,
  split de dependencias dev/prod, plan + ADRs. *(Esta entrega.)*
- **B - Red E2E**: Playwright + caracterizacion de flujos criticos. Depende de A1.
- **C - Tipos OpenAPI**: drf-spectacular -> `/api/schema/` -> openapi-typescript
  -> cliente API tipado. Depende de A1.
- **D - Backend reorg** (paralelo): `inventory/stock.py`, `config/serializers.py`,
  convencion de side-effects. Sin cambio de API.
- **E - Server-state**: TanStack Query; migrar las 25 colecciones y borrar los
  `useEffect` de carga. Depende de C.
- **F - Romper el god component**: una seccion -> un container tipado por PR;
  `renderX` -> componentes. Depende de B, C, E.
- **G - Barrel + god components restantes**: `page-support.tsx`,
  `SettingsWorkspace`, `DashboardPanel`, `PublicLandingClient`, split de
  `test_mvp_flows.py`. Depende del patron de F.
- **H - Cierre**: endurecer gates (`no-explicit-any` -> error, `max-lines` ->
  error, AnyRecord = 0, E2E required), escribir convenciones, limpieza.

Ruta critica: `A1 -> B + C -> E -> F -> H`. En paralelo: D y G2-G4.

## Desglose de PRs (referencia)

- **A1** tooling (ESLint/Prettier/ruff, scripts, gates advisory en `validate.yml`).
- **A2** split `requirements-dev.txt`.
- **A3** plan + 4 ADRs.
- **B1** Playwright + smoke E2E (login) en CI.
- **B2..B7** E2E de caracterizacion por flujo critico.
- **C1** drf-spectacular + `/api/schema/` + validacion en CI.
- **C2** `gen:types` + gate de drift. **C3** cliente `apiFetch<T>` tipado.
- **D1** motor de stock -> `inventory/stock.py`. **D2** `config/serializers.py`
  + split de views. **D3** convencion side-effects documentada.
- **E1** provider + primera coleccion como patron. **E2..** resto de colecciones.
- **F0** andamiaje + primera seccion (Caja). **F1..Fk** una seccion por PR.
- **G1** romper el barrel. **G2-G4** otros god components. **G5** split del god test.
- **H1** ratchet de gates. **H2** convenciones escritas. **H3** limpieza.

## Riesgos y mitigaciones

- Regresion en flujos no cubiertos -> E2E primero + checklist de paridad por
  seccion + deploy demo de verificacion.
- OpenAPI incompleto por serializers dinamicos -> validacion en CI +
  `@extend_schema_field` en `SerializerMethodField`.
- TanStack Query cambia timing de loading -> preservar estados de carga; E2E cubre.
- Archivos generados (CHANGELOG/indices) en PRs concurrentes -> ya resuelto por
  el hook `.githooks/pre-commit` (no los agrega en feature branches).

## Convenciones a escribir (Track H)

Limite de tamano de archivo/componente; prohibicion de `any`/`AnyRecord`;
ubicacion de logica de dominio; estructura estandar de app Django
(`models`/`serializers`/`views`/`*.py` de dominio); no barrels gordos; tooling
obligatorio en CI + pre-commit; separacion dev/prod deps; testing del shell de
front; componentes vs closures `renderX`.
