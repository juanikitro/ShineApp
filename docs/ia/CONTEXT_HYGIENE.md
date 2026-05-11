# CONTEXT_HYGIENE.md

Guia de higiene de contexto para asistentes en ShineApp.

Fuente de verdad:
- `../../AGENTS.md`

## Regla principal

Cargar primero el minimo contexto suficiente y expandir solo cuando haya evidencia concreta de que falta contexto.

Evitar:
- abrir backend y frontend completos por si acaso,
- leer varias guias largas al inicio,
- imponer arquitectura de otro repo,
- hacer limpieza oportunista fuera del alcance.

## Lectura inicial obligatoria

Para cualquier tarea:
1. `AGENTS.md`
2. `docs/indice.md`
3. archivo(s) objetivo
4. tests del flujo o modulo afectado, si existen
5. una sola guia de `docs/ia/` elegida por tipo de tarea

## Elegir una sola guia inicial

- bugfix o feature API/backend: `docs/ia/TESTING.md`
- cambio de boundaries o contrato entre capas: `docs/ia/ARCHITECTURE.md`
- cambio de frontend, TypeScript o CSS: `docs/ia/UI_CONTEXT.md`
- auth, secretos, CORS, emails o datos sensibles: `docs/ia/SECURITY_AI.md`
- manejo de errores, fallbacks o mensajes al usuario: `docs/ia/ERRORS_LOGGING.md`

## Cuando ampliar

Ampliar contexto si aparece alguna de estas senales:
- no esta claro donde vive la logica,
- el flujo cruza backend y frontend,
- hay side effects no visibles,
- aparecen permisos o reglas de negocio,
- el cambio toca comportamiento observable.

En esos casos, leer solo lo siguiente que destraba:
- serializer o model relacionado,
- endpoint y consumidor frontend,
- una segunda guia de `docs/ia/`,
- documentacion de `docs/contexto/`.

## Matriz minima por tarea

### Bugfix DRF

Inicial:
- `AGENTS.md`
- endpoint o `views.py` afectado
- serializer relacionado
- test del flujo
- `docs/ia/TESTING.md`

Expandir si hace falta:
- model implicado
- consumidor frontend
- `docs/ia/ERRORS_LOGGING.md`

### Cambio de frontend

Inicial:
- `AGENTS.md`
- `frontend/app/page.tsx` o archivo objetivo
- partial CSS relevante en `frontend/app/styles/`
- `docs/ia/UI_CONTEXT.md`

Expandir si hace falta:
- `docs/ia/STYLE_GUIDE.md`
- `frontend/lib/`
- endpoint consumido
- `docs/ia/ARCHITECTURE.md`

### Cambio en modelo o serializer

Inicial:
- `AGENTS.md`
- model afectado
- serializer relacionado
- test del flujo
- `docs/ia/ARCHITECTURE.md`

Expandir si hace falta:
- endpoint que lo usa
- consumidor frontend
- `docs/ia/SECURITY_AI.md` si expone datos sensibles

## Git y versionado

- Si el checkout no tiene Git, no inventar ramas ni worktrees.
- Si la tarea exige publicar y hay Git disponible, aislar la tarea antes de editar.
