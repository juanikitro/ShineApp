# AGENTS.md

Guia compacta para IAs en ShineApp. Detalle tecnico en `docs/`.

## Contexto

Antes de editar: lee `AGENTS.md`, `docs/indice.md`, archivos objetivo, tests cercanos si existen y una guia relevante de `docs/ia/`.

Usa `docs/ia/CONTEXT_HYGIENE.md`. Preferi `docs/agent-context.compact.md` y luego `*.compact.md` si alcanza. Si compacto contradice codigo, tests, specs, ADRs, `docs/registro/**`, `docs/ia/**` o este archivo, gana la fuente fuerte.

## Repo

- Backend: Django + DRF en `backend/`.
- Frontend: Next.js App Router en `frontend/`.
- Runtime local: `docker-compose.yml` con `db`, `backend`, `frontend`.
- DB: Postgres en Docker; backend puede validar con SQLite.
- API: `backend/config/urls.py`.
- UI principal: `frontend/app/page.tsx`, `frontend/lib/page-support.tsx`, `frontend/app/styles/*.css`.
- No inventes endpoints, payloads, permisos, modelos, migraciones, capas `services/` obligatorias ni tooling inexistente.

## Cambios

- Diffs chicos, patron existente, sin refactor/formateo masivo.
- Si tocas API, serializer, modelo, permiso o migracion: revisa backend + consumidor frontend, conserva compatibilidad o justifica el cambio, agrega/ajusta tests y documenta contrato.
- Si tocas side effects (stock, caja, pagos, estados, emails, notificaciones): hacelos visibles y cubri con tests cuando sea viable.
- Si es trivial y no amerita doc, decilo.

## Tests

- Todo codigo nuevo o logica modificada lleva tests en el mismo cambio.
- Cubre caso normal, bordes (`vacio`, `null`, `0`, invalido) y ramas (`if`, ternario, `switch`).
- Frontend CI exige `branches >= 80%`; no agregues modulos sin tests.
- Convenciones: `frontend/lib/*.test.mjs`; componentes `*.test.tsx`; backend en `backend/tests/`.
- Ejecuta solo tests especificos del cambio. No corras suites completas, coverage global, builds ni validaciones amplias sin permiso explicito.
- Si no podes testear, declara razon, impacto y alternativa. No lo omitas.

## UI

Para UI lee `docs/ia/UI_CONTEXT.md`, archivo objetivo y CSS parcial relevante. Reusa componentes, tokens y partials; evita inline/one-off. Default visual: CRM claro y sobrio; dark navy solo variante.

## Validacion

- Antes de Node/Vitest/Next, revisa `docs/ia/TESTING.md#restriccion-de-recursos-frontend`.
- No inicies tests, coverage, build o dev server frontend en paralelo entre si.
- Pedi permiso antes de comandos pesados/lentos/amplios/con impacto externo: suites completas, coverage, builds, Docker, migraciones, E2E, validaciones globales.
- Si un comando autorizado supera 5 minutos, dejalo corriendo en paralelo, informa estado y pregunta si cortar o seguir.
- `scripts/validate.ps1` es amplio: usar solo con permiso explicito.

Checks puntuales utiles:
- Backend tests: `cd backend` + `py -3 -m pytest` o `.\.venv\Scripts\python.exe -m pytest`
- Backend check: `cd backend` + `.\.venv\Scripts\python.exe manage.py check`
- Frontend tests especificos: `cd frontend` + comando puntual para archivo/patron afectado
- Frontend build: `cd frontend` + `npm run build`
- Compose: `docker compose config --quiet`

## Deploy

- No deploy/prod/promociones Vercel sin confirmacion humana.
- No exponer, pegar, commitear ni loguear secrets; usa placeholders en `.env.example`.
- No filesystem local para media persistente; demo/prod usa storage remoto documentado.
- Vercel no es servidor persistente: sin workers largos, estado local ni migraciones automaticas en cold start.
- Para deploy prep, corre checks relevantes de `scripts/deploy/` o explica bloqueo. Manuales van en `docs/deployment/manual-steps.md`.

## Git

- Por tarea, crea rama basada en `development`.
- Nombre estructurado: `feat/...`, `fix/...`, `docs/...`, `chore/...` segun el trabajo.
- `main` es publicacion.
- Si hay Git: trabaja, commitea y pushea la rama de tarea en unidades chicas y validadas.
- Antes de commit: revisa diff y validacion minima relevante.
- Si push bloquea, reporta y pedi confirmacion de ruta de publicacion.
- Si no hay Git, no inventes ramas/commits/PRs.
- Si es solo lectura o el usuario pide no versionar, no commit ni push.

## Final

- Contexto minimo leido.
- Sin contratos publicos rotos sin justificar.
- Tests nuevos/ajustados para logica nueva.
- Solo tests especificos autorizados corridos, o bloqueo explicado.
- Docs actualizadas si el cambio lo exige.

## Fuentes

`docs/indice.md`, `docs/ia/CONTEXT_HYGIENE.md`, `docs/ia/TESTING.md`, `docs/ia/UI_CONTEXT.md`, `docs/ia/ARCHITECTURE.md`, `docs/registro/errores-agentes.md`, `CHANGELOG.md`.
