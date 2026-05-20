# Configuracion De Vercel

Los deploys manuales o promociones todavia requieren confirmacion humana. El camino automatizado aprobado para la demo publica es el workflow de GitHub Actions documentado en `docs/deployment/github-actions.md`.

## Proyecto Web

- Nombre del proyecto: `shineapp-web`
- Project id: `prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`
- Root Directory: `frontend`
- Framework preset: Next.js
- Install command: default o `npm install`
- Build command: `npm run build`
- Output: default de Vercel para Next.js
- Env vars:
  - `NEXT_PUBLIC_API_URL=https://shineapp-api.vercel.app/api` para la demo publica

## Proyecto API

- Nombre del proyecto: `shineapp-api`
- Project id: `prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`
- Root Directory: `backend`
- Runtime: Python, fijado con `backend/.python-version` a `3.12`
- Entrypoint: `backend/wsgi.py` expone `app`
- Install command: `python -m pip install -r requirements.txt`
- Build command: `python manage.py collectstatic --noinput`
- Env vars:
  - `DJANGO_SETTINGS_MODULE=config.settings_production`
  - todas las variables privadas backend de `docs/deployment/env-vars.md`

`backend/vercel.json` mantiene install/build explicitos y excluye artefactos solo-locales del bundle de la funcion Python.

Healthcheck despues del deploy:

```text
https://shineapp-api.vercel.app/api/health/
```

Es publico y verifica que Django pueda abrir una conexion a la base de datos.

Aliases publicos actuales de produccion:

- API: `https://shineapp-api.vercel.app`
- Web: `https://shineapp-web.vercel.app`

Las env vars de produccion estan configuradas en Vercel para la demo publica. Las env vars de preview todavia pueden necesitar configuracion acotada por branch desde el Dashboard si se vuelven a usar deploys preview.

Env vars backend requeridas:

- `DJANGO_SETTINGS_MODULE=config.settings_production`
- `DJANGO_SECRET_KEY`
- `DATABASE_URL`
- `DATABASE_SSL_REQUIRE=1`
- `DJANGO_ALLOWED_HOSTS=shineapp-api.vercel.app`
- `CORS_ALLOWED_ORIGINS=https://shineapp-web.vercel.app`
- `CORS_ALLOWED_ORIGIN_REGEXES` (`^https://.*\.vercel\.app$` solo para preview)
- `CSRF_TRUSTED_ORIGINS=https://shineapp-web.vercel.app`
- `SUPABASE_STORAGE_ENABLED=1`
- `SUPABASE_STORAGE_BUCKET=shineapp-media`
- `SUPABASE_S3_ENDPOINT_URL=https://cdzqcpwbsfyeeigecqwr.storage.supabase.co/storage/v1/s3`
- `SUPABASE_S3_REGION_NAME=sa-east-1`
- `SUPABASE_S3_ACCESS_KEY_ID`
- `SUPABASE_S3_SECRET_ACCESS_KEY`
- `SUPABASE_STORAGE_QUERYSTRING_AUTH=1`
- `SUPABASE_STORAGE_LOCATION=media`

Env vars frontend requeridas:

- `NEXT_PUBLIC_API_URL=https://shineapp-api.vercel.app/api`

## Paso Manual De Migracion

El build de Vercel no debe ejecutar migraciones automaticamente. Para deploys demo rutinarios desde `main`, GitHub Actions ejecuta migraciones antes del deploy en Vercel. Para deploys manuales one-off fuera de Actions, ejecutar migraciones como paso aprobado desde una maquina confiable:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_migrations"
$env:DJANGO_MIGRATION_SECRET_KEY="<dedicated-migration-secret>"
$env:DATABASE_URL="<supabase-pooler-url>"
.\.venv\Scripts\python.exe manage.py migrate
```

Antes de cualquier migracion, imprimir y revisar el plan:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_migrations"
$env:DJANGO_MIGRATION_SECRET_KEY="<dedicated-migration-secret>"
$env:DATABASE_URL="<supabase-pooler-url>"
.\.venv\Scripts\python.exe manage.py migrate --plan
```

Ejecutar `seed_demo` solo para entornos demo y solo despues de confirmar la base de datos destino. El workflow de deploy de GitHub Actions nunca ejecuta `seed_demo` y nunca crea superusers.

## GitHub Actions CI/CD

Workflow: `.github/workflows/deploy-vercel-demo.yml`.

Triggers:

- `push` a `main`
- `workflow_dispatch`

Secretos GitHub requeridos:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_FRONTEND_PROJECT_ID`
- `VERCEL_BACKEND_PROJECT_ID`
- `DATABASE_URL` en el entorno `demo-production`
- `DJANGO_MIGRATION_SECRET_KEY` en el entorno `demo-production`

Los secretos de runtime backend no se duplican en GitHub. El workflow usa `config.settings_migrations` para el paso de migracion de base de datos y deja el runtime env completo en el proyecto Vercel API.

Orden de deploy:

1. Checks backend y frontend.
2. `python backend/manage.py migrate --plan`.
3. `python backend/manage.py migrate --noinput`.
4. Pull de configuracion del proyecto backend en Vercel.
5. Deploy productivo del proyecto backend en Vercel.
6. Pull de configuracion del proyecto frontend en Vercel.
7. Deploy productivo del proyecto frontend en Vercel.
8. Smoke test contra `https://shineapp-web.vercel.app` y `https://shineapp-api.vercel.app/api`.

No habilitar los deploys Git productivos integrados de Vercel para estos proyectos al mismo tiempo que este workflow salvo que esten configurados explicitamente para saltearse. El workflow de GitHub Actions es el gate de migracion; un deploy Git paralelo de Vercel puede publicar codigo antes de que corran las migraciones.

Las migraciones automaticas requieren migraciones Django compatibles hacia adelante. Cambios destructivos de schema, migraciones grandes de datos, renombres y agregados non-null sin defaults seguros necesitan revision manual antes de mergear a `main`.

Validado el 2026-05-18:

- `scripts/deploy/smoke-test.ps1 -WebBaseUrl https://shineapp-web.vercel.app -ApiBaseUrl https://shineapp-api.vercel.app/api`
- Login en navegador desde web publica a API publica.
- El bundle deployado de Next contiene la URL publica de API y no contiene localhost ni placeholder de API URL.
- La pagina de login de Django admin y el CSS `/static/admin/...` retornan 200.
- Logs recientes de error de Vercel para ambos proyectos no retornaron entradas.
