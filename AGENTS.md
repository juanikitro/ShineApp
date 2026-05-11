# AGENTS.md

Guia raiz para IAs que trabajen en ShineApp. Este archivo es mapa y reglas de comportamiento; el detalle tecnico vive en `docs/`.

## Prioridad

- Segui primero la instruccion mas local y especifica.
- Specs, ADRs y docs tecnicas relevantes son fuente de verdad.
- Si falta contexto critico, explicita supuesto, impacto y segui con la opcion mas segura.

## Lectura minima

Antes de editar:
1. `AGENTS.md`
2. `docs/indice.md`
3. archivo(s) objetivo
4. tests cercanos si existen
5. una sola guia de `docs/ia/` segun la tarea

Usa `docs/ia/CONTEXT_HYGIENE.md` para decidir que abrir. Expandi contexto solo con evidencia concreta: endpoint, serializer/model, consumidor frontend, permiso, side effect o doc de contexto.

## Boundaries del repo

- Backend: Django + DRF en `backend/`.
- Frontend: Next.js App Router en `frontend/`.
- Runtime local: `docker-compose.yml` levanta `db`, `backend` y `frontend`.
- Postgres corre en Docker; el backend tiene fallback SQLite para validacion local.
- API publicada desde `backend/config/urls.py`.
- UI principal en `frontend/app/page.tsx`, `frontend/lib/page-support.tsx` y `frontend/app/styles/*.css`.

No inventes endpoints, payloads, permisos, modelos, migraciones, capas `services/` obligatorias ni tooling que no exista en el repo.

## Cambios seguros

- Mantene diffs chicos y alineados al patron existente.
- No mezcles feature, refactor amplio y formateo masivo.
- Si cambias API, serializer, modelo, permiso o migracion: revisa backend + consumidor frontend, conserva compatibilidad o justifica el cambio, agrega/ajusta tests y documenta el contrato.
- Si tocas side effects como stock, caja, pagos, estado de ordenes, emails o notificaciones, hacelos visibles y cubri el caso con tests cuando sea viable.
- Si el cambio es trivial y no amerita doc nueva, decilo en la entrega.

## UI

- Para UI lee `docs/ia/UI_CONTEXT.md`, el archivo objetivo y la partial CSS relevante.
- Lee `docs/design-brief.md`, `docs/design-system.md`, `docs/inspiration.md` o `docs/ui-review-checklist.md` solo cuando el alcance lo pida.
- Reusa componentes, tokens y partials existentes; evita estilos inline u one-off si la regla puede vivir en `frontend/app/styles/*.css`.
- Mantene el default visual como CRM claro y sobrio; el dark navy queda como variante soportada.

## Validacion

Comando recomendado desde la raiz:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

Checks puntuales:
- Backend: `cd backend` + `py -3 -m pytest` o `.\.venv\Scripts\python.exe -m pytest`
- Backend salud: `cd backend` + `.\.venv\Scripts\python.exe manage.py check`
- Frontend tests: `cd frontend` + `npm run test`
- Frontend build: `cd frontend` + `npm run build`
- Compose: `docker compose config --quiet`

Si no podes validar, informa causa, impacto y alternativa razonable. No confundas validacion parcial con cierre total.

## Git

Solo si la tarea implica versionar/publicar:
- verifica si este checkout tiene Git inicializado,
- si hay Git, trabaja aislado cuando haga falta,
- no hagas push a ramas protegidas,
- si no hay Git, no inventes ramas, commits ni PRs.

Si la tarea no implica versionar/publicar, no gastes contexto en Git.

## Checklist final

- Lei solo el contexto necesario.
- No cambie contratos publicos sin justificar compatibilidad.
- Agregue o actualice tests cuando el cambio lo requeria.
- Ejecute validacion relevante o explique el bloqueo.
- Documente cambios importantes en `docs/`.
- Entregue resumen compacto con cambio, validacion y riesgos.

## Fuentes utiles

- `docs/indice.md`: mapa de fuentes de verdad.
- `docs/ia/CONTEXT_HYGIENE.md`: matriz de carga minima.
- `docs/ia/TESTING.md`: comandos y criterios de testing.
- `docs/ia/UI_CONTEXT.md`: reglas de UI y superficies reales.
- `docs/ia/ARCHITECTURE.md`: boundaries y contratos.
- `docs/registro/errores-agentes.md`: errores repetidos que el harness busca prevenir.
