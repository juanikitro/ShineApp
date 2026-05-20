# Documentacion ShineApp

Mapa de fuentes de verdad para asistentes y desarrolladores. No reemplaza la lectura del codigo tocado.

## Documentacion navegable

El sitio navegable usa MkDocs Material sobre este mismo directorio `docs/`. No migra ni duplica la fuente de verdad: `docs/indice.md` sigue siendo el mapa canonico.

Comandos:

```powershell
py -3 -m pip install -r requirements-docs.txt
py -3 -m mkdocs serve
py -3 scripts/check_docs.py --check
py -3 -m mkdocs build --strict
```

Para regenerar indices automaticos:

```powershell
py -3 scripts/check_docs.py --write --skip-build
```

El build docs debe fallar si hay links rotos, nav invalida o archivos canonicos faltantes.

## Entradas principales

- `AGENTS.md`: reglas raiz para cualquier asistente.
- `README.md`: stack, arranque local y validacion.
- `docker-compose.yml`: contrato local de servicios.
- `backend/config/settings.py`: auth, DB, CORS, email y defaults operativos.
- `backend/config/urls.py`: router principal de la API.

## Contexto del proyecto

- `docs/contexto/panorama.md`: vision general del producto.
- `docs/contexto/arquitectura.md`: mapa tecnico backend/frontend/Compose.
- `docs/contexto/aplicaciones.md`: apps Django, superficies frontend y tests visibles.

## Guias para asistentes

- `docs/ia/CONTEXT_HYGIENE.md`: que leer y cuando expandir contexto.
- `docs/ia/TESTING.md`: comandos de validacion y criterio de tests.
- `docs/ia/CODEX_TESTING_PROMPT.md`: prompt copy/paste para generar tests sin maquillar coverage.
- `docs/ia/UI_CONTEXT.md`: entrada corta para cambios de UI.
- `docs/ia/ARCHITECTURE.md`: boundaries y cambios full-stack.
- `docs/ia/STYLE_GUIDE.md`: convenciones de codigo.
- `docs/ia/SECURITY_AI.md`: auth, secretos y datos sensibles.
- `docs/ia/ERRORS_LOGGING.md`: errores, excepciones y logging.
- `docs/ia/CONTRIBUTING_AI.md`: flujo recomendado de trabajo asistido.
- `docs/agentes/guia.md`: resumen rapido para asistentes.
- `docs/registro/errores-agentes.md`: errores repetidos y prevenciones.

Wrappers por herramienta:
- `CODEX.md`
- `CLAUDE.md`
- `LLM.md`
- `.github/copilot-instructions.md`
- `.codex/rules.md`

## Registro tecnico

- `docs/registro/README.md`: convencion spec-as-source.
- `docs/registro/cambios/`: cambios funcionales o visibles ya registrados.
- `docs/registro/cambios/index.md`: indice generado de cambios. No editar manualmente.
- `docs/registro/decisiones/`: decisiones de arquitectura, negocio o contrato.
- `docs/registro/decisiones/index.md`: indice generado de decisiones. No editar manualmente.
- `docs/plans/`: planes y disenos historicos. Usalos como contexto solo si el cambio actual lo requiere.
- `docs/plans/index.md`: indice generado de planes. No editar manualmente.

Reglas vivas:
- Todo cambio funcional visible va a `docs/registro/cambios/`.
- Toda decision de arquitectura, contrato o negocio va a `docs/registro/decisiones/`.
- `docs/indice.md` sigue siendo el mapa canonico.
- GitHub Pages, Vercel o Read the Docs son opciones futuras; no hay deploy automatico de docs.

## Deploy

- `docs/deployment/architecture.md`: arquitectura demo y camino a produccion.
- `docs/deployment/env-vars.md`: variables privadas/publicas y placeholders.
- `docs/deployment/vercel.md`: configuracion de proyectos Vercel.
- `docs/deployment/github-actions.md`: deploy demo manual desde GitHub Actions.
- `docs/deployment/supabase.md`: Postgres y Storage.
- `docs/deployment/media-static.md`: media persistente y archivos estaticos.
- `docs/deployment/manual-steps.md`: pasos manuales obligatorios antes de deploy.
- `docs/deployment/demo-readiness.md`: estado real de recursos demo y bloqueadores.

## Diseno y UI

- `docs/ia/UI_CONTEXT.md`: primera lectura para UI.
- `docs/design-brief.md`: norte de producto, tono y direccion visual.
- `docs/design-system.md`: tokens, layout, accesibilidad y primitives.
- `docs/inspiration.md`: referencias visuales.
- `docs/ui-review-checklist.md`: checklist para cambios UI grandes o sensibles.
- `assets/design-inspo/README.md`: reglas para referencias visuales.

## Contexto minimo actual

- Stack: Django + DRF en `backend/`, Next.js en `frontend/`, Postgres en Docker y SQLite como fallback local.
- API autenticada por defecto con `TokenAuthentication` y `SessionAuthentication`.
- Frontend principal: `frontend/app/page.tsx`, `frontend/lib/page-support.tsx` y partials en `frontend/app/styles/`.
- Tests backend: `backend/tests/`.
- Tests frontend: `frontend/lib/*.test.mjs` y `frontend/app/components/**/*.test.{ts,tsx}`.
- Validacion raiz: `scripts/validate.ps1`.
- Coverage raiz: `scripts/test-coverage.ps1` con gate 90 backend/frontend.
