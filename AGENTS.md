# AGENTS.md

Guia compacta para IAs en ShineApp. Detalle tecnico en `docs/`.

## Contexto

Antes de editar: lee `AGENTS.md`, `docs/indice.md`, archivos objetivo, tests cercanos si existen y una guia relevante de `docs/ia/`.

En cada cambio, trata la documentacion como `spec-as-source`: identifica la fuente documental que describe el contrato o comportamiento afectado, actualizala en el mismo diff si el cambio altera reglas, flujos, permisos, payloads, estados, comandos operativos, decisiones tecnicas o expectativas de UI, y crea una nota breve en `docs/` cuando no exista una fuente clara. Si el cambio es puramente mecanico o no amerita documentacion, dejalo explicitado en el reporte final.

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
- En implementaciones que lleven diseno de sistemas, usa la skill `grill-with-docs` antes de cerrar el plan o el diff; si no esta instalada/disponible, reportalo y aplica el mejor fallback con documentacion revisada.
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

## Operacion critica

- No edites manualmente `CHANGELOG.md` ni indices generados en `docs/registro/**`; si agregas registros, regenera con `py -3 scripts/check_docs.py --write --skip-build` o explica el bloqueo.
- Antes de correr Vitest, Next, coverage, build o dev server frontend, revisa procesos `node.exe` scoped a `ShineApp/frontend`; no ejecutes Node/Vitest/Next en paralelo.
- Si agregas logica frontend nueva, evita enterrarla en `frontend/app/page.tsx`: extraela a `frontend/lib/**` o a un componente testeable cuando sea razonable.
- Para reglas dependientes de fecha de caja/local, usa `cash_day(...)`; no uses `.date()` UTC como reemplazo.
- Para endpoints o serializers por negocio/tenant, reutiliza los mixins y patrones existentes de scoping/permisos antes de crear filtros manuales.
- No ocultes silenciosamente errores de API ni expongas trazas, secretos o payloads sensibles en mensajes/logs.
- Si un side effect toca stock, caja, pagos, estados, emails o notificaciones, hacelo explicito y cubrilo con tests cuando sea viable.
- Si detectas un fallo recurrente de agentes, registra patron, causa, prevencion y validacion en `docs/registro/errores-agentes.md`.

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

## Fuentes

`docs/indice.md`, `docs/ia/CONTEXT_HYGIENE.md`, `docs/ia/TESTING.md`, `docs/ia/UI_CONTEXT.md`, `docs/ia/ARCHITECTURE.md`, `docs/registro/errores-agentes.md`, `CHANGELOG.md`.
