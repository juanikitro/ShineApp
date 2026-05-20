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

## Contexto compacto

- Para ahorrar tokens, preferi `docs/agent-context.compact.md` y luego `*.compact.md` cuando alcance como contexto liviano.
- Si un compacto contradice codigo, tests, specs, ADRs, `docs/registro/**`, `docs/ia/**` o este archivo, ignora el compacto.
- Nuevos registros spec-as-source deben escribirse compactos estilo caveman, preservando exactos comandos, paths, endpoints, permisos y snippets.

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

Restriccion frontend: antes de correr comandos Node/Vitest/Next, revisa `docs/ia/TESTING.md#restriccion-de-recursos-frontend`. No ejecutes tests, coverage, build o dev server frontend en paralelo.

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

## Deploy

- No hagas deploy a produccion ni promociones de Vercel sin confirmacion humana explicita.
- No escribas, pegues ni commitees secrets reales. Usa `.env.example` solo con placeholders.
- No uses filesystem local para media persistente; en demo/prod debe ir a Supabase Storage u otro storage remoto documentado.
- No asumas que Vercel es un servidor persistente: sin workers largos, sin estado local, sin migraciones automaticas en cada cold start.
- Antes de cerrar tareas de deploy prep, corre checks relevantes de `scripts/deploy/` o explica el bloqueo.
- Si queda algo manual, agregalo o mantenelo en `docs/deployment/manual-steps.md` con que hacer, donde, por que, valor a copiar y como validar.

## Git

Regla local de ramas:
- Trabaja por defecto sobre `development`; este entorno debe mantenerse abierto en esa rama.
- `main` queda reservada como branch de publicacion.
- No crees ramas nuevas ni worktrees salvo que el usuario lo pida explicitamente. Si aparece un bloqueo tecnico que realmente lo requiera, explicalo antes de actuar.

Versionado durante las tareas:
- Si este checkout tiene Git inicializado, commitea y pushea sistematicamente a `origin/development` a medida que avances.
- Usa commits chicos por unidades coherentes y validadas; no acumules cambios locales grandes si ya hay un bloque listo para publicar.
- Antes de cada commit revisa el diff y ejecuta la validacion minima relevante; si no podes validar, dejalo explicito en el mensaje de entrega.
- Si el push directo a `development` esta bloqueado por permisos, protecciones o conflictos remotos, no improvises otra rama: reporta el bloqueo y pedi confirmacion de la ruta de publicacion.
- Si no hay Git inicializado, no inventes ramas, commits ni PRs.

Si la tarea es solo lectura o el usuario pide explicitamente no versionar, no hagas commit ni push.

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
