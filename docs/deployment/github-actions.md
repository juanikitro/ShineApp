# GitHub Actions CI/CD

ShineApp usa GitHub Actions como el unico camino automatizado aprobado para demo-production. Los pull requests a `main` corren sin secretos. Los merges a `main` corren migraciones contra Supabase y deployan ambos proyectos Vercel.

Este workflow sigue siendo un camino demo-production. Antes de datos reales de clientes, crear proyectos Vercel separados para staging y produccion, proyectos Supabase, buckets Storage, entornos Sentry y entornos GitHub; no reutilizar `demo-production` como entorno real de produccion.

## Gate De Pull Request

Workflow: `.github/workflows/validate.yml`.

Triggers:

- `pull_request` hacia `main`
- `merge_group`
- `push` a `main` y `development`

Check requerido de branch protection:

- `Validate / ci-required`

El job `ci-required` es el unico check que debe requerirse en branch protection. Espera los jobs reales y falla si algun job requerido falla, se cancela o se saltea.

Jobs:

- `backend`: instala dependencias Python 3.12, corre `manage.py check`, `makemigrations --check --dry-run` y tests backend con `pytest --cov`.
- `frontend`: instala dependencias Node 22 con `npm ci`, corre `npm run test:coverage`, `npm run build` y `npm audit --omit=dev`.
- `dependency-audit`: instala `pip-audit==2.10.0` y audita `backend/requirements.txt`.
- `codeql`: corre CodeQL v4 para Python y JavaScript/TypeScript.
- `ci-required`: resume los jobs requeridos y provee el unico status check requerido.

Los jobs de PR no reciben secretos de Vercel, Supabase, storage, SMTP ni produccion Django.

## Deploy De Main

Workflow: `.github/workflows/deploy-vercel-demo.yml`.

Triggers:

- `push` a `main`
- `workflow_dispatch`

Entorno:

- `demo-production`

El workflow deploya automaticamente despues del merge a `main`. El entorno debe restringir ramas de deploy a `main`, pero no debe requerir revisores manuales mientras la politica elegida sea deploy automatico.

Secretos requeridos de repositorio GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_FRONTEND_PROJECT_ID`
- `VERCEL_BACKEND_PROJECT_ID`

Secretos requeridos del entorno `demo-production`:

- `DATABASE_URL`
- `DJANGO_MIGRATION_SECRET_KEY`

Secret opcional del entorno `demo-production`:

- `SMOKE_TEST_TOKEN`

Los secretos de runtime backend quedan en el proyecto Vercel API. No duplicar `DJANGO_SECRET_KEY`, claves Supabase S3 ni secretos SMTP en GitHub salvo que un workflow futuro necesite explicitamente una credencial deploy-time mas acotada.

Produccion real ademas requiere `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, tasas de throttle y estado WAF en el runtime env backend. Mantener esos valores en el dashboard del proyecto runtime, no en archivos del repositorio.

## Orden De Deploy

1. Validar secretos GitHub requeridos.
2. Instalar Python 3.12 y Node 22.
3. Instalar dependencias backend y frontend.
4. Correr checks backend: Django system check, migration drift check, coverage gate backend.
5. Correr auditoria de dependencias Python con `pip-audit==2.10.0`.
6. Correr coverage gate frontend, build Next y auditoria de dependencias productivas.
7. Correr plan de migracion Django contra Supabase con `config.settings_migrations`.
8. Aplicar migraciones Django con `migrate --noinput`.
9. Instalar `vercel@54.2.0`.
10. Hacer pull de configuracion del proyecto backend en Vercel y deployar `shineapp-api` a produccion.
11. Hacer pull de configuracion del proyecto frontend en Vercel y deployar `shineapp-web` a produccion.
12. Smoke test de `https://shineapp-web.vercel.app` y `https://shineapp-api.vercel.app/api`.

Si fallan las migraciones, el deploy Vercel no corre. Si falla el deploy backend, el deploy frontend no corre. Si fallan los smoke tests, el workflow falla despues del deploy y el despliegue debe triagearse antes de otro cambio productivo.

## Politica De Migraciones

El workflow de deploy corre migraciones automaticamente antes de los deploys productivos de Vercel. Los cambios de schema mergeados a `main` deben ser compatibles hacia adelante con el codigo vivo actual:

- tablas, campos, indices y columnas nullable aditivos son aceptables;
- el codigo debe tolerar schema viejo y nuevo durante la ventana breve de deploy;
- migraciones destructivas, backfills grandes, renombres y agregados non-null sin defaults seguros requieren revision manual y un plan de rollout explicito.

El workflow nunca corre `seed_demo` y nunca crea superusers.

## Configuracion Del Repositorio

Proteger `main` con:

- Requerir pull request antes de mergear.
- Requerir status checks exitosos antes de mergear: `Validate / ci-required`.
- Requerir merge queue, o requerir que las ramas esten actualizadas antes de mergear si merge queue no esta disponible.
- Requerir resolucion de conversaciones antes de mergear.
- No permitir bypass de la configuracion anterior.
- Bloquear force pushes y borrado de ramas.

Si merge queue esta habilitado, mantener el trigger `merge_group` en `validate.yml`; si no, los merges en cola pueden fallar porque nunca se reportan los checks requeridos.

## Configuracion De Vercel

Deshabilitar los deploys productivos Git integrados de Vercel para ambos proyectos, o configurar ignored build steps para que los pushes Git no creen deploys productivos independientes. GitHub Actions es el gate de migracion; un deploy Git paralelo de Vercel puede publicar codigo antes de que el schema Supabase este migrado.

Aliases demo-production aprobados:

- Web: `https://shineapp-web.vercel.app`
- API: `https://shineapp-api.vercel.app/api`
