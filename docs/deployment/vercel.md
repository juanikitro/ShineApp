# Configuracion De Vercel

Los deploys manuales o promociones todavia requieren confirmacion humana. El camino automatizado aprobado para la demo publica es el workflow de GitHub Actions documentado en `docs/deployment/github-actions.md`.

## Proyecto Web

- Nombre del proyecto: `shineapp-web`
- Project id: `<VERCEL_WEB_PROJECT_ID>`
- Root Directory: `frontend`
- Framework preset: Next.js
- Install command: default o `npm install`
- Build command: `npm run build`
- Output: default de Vercel para Next.js
- Env vars:
  - `NEXT_PUBLIC_API_URL=https://<API_HOST>/api` para la demo publica

## Proyecto API

- Nombre del proyecto: `shineapp-api`
- Project id: `<VERCEL_API_PROJECT_ID>`
- Root Directory en Git Integration: sin configurar. El workflow aprobado usa
  `--cwd backend` para el deploy productivo.
- Runtime: Python, fijado con `backend/.python-version` a `3.12`
- Entrypoint: `backend/wsgi.py` expone `app`
- Region de computo: `gru1` (Sao Paulo), fijada en `backend/vercel.json` para
  co-ubicar la funcion con la DB Supabase `sa-east-1`. Hobby permite una sola
  region. Verificar post-deploy con el header `x-vercel-id` (`gru1::gru1::...`).
- Fluid Compute: habilitado con `"fluid": true` en `backend/vercel.json` para
  reducir cold starts (las instancias se mantienen tibias mas tiempo y se reusan).
  $0 en Hobby (es el modelo de computo por defecto de Vercel). `conn_max_age=0`
  se mantiene; cada request sigue usando una conexion por request via el pooler.
- Install command: `python -m pip install -r requirements.txt`
- Build command: `python manage.py collectstatic --noinput`
- Env vars:
  - `DJANGO_SETTINGS_MODULE=config.settings_production`
  - todas las variables privadas backend de `docs/deployment/env-vars.md`

`backend/vercel.json` mantiene install/build explicitos y excluye artefactos solo-locales del bundle de la funcion Python.

Healthcheck despues del deploy:

```text
https://<API_HOST>/api/health/
```

Es publico y verifica que Django pueda abrir una conexion a la base de datos.

Aliases publicos actuales de produccion:

- API: `https://<API_HOST>`
- Web: `https://<WEB_HOST>`

Las env vars de produccion estan configuradas en Vercel para la demo publica. Las env vars de preview todavia pueden necesitar configuracion acotada por branch desde el Dashboard si se vuelven a usar deploys preview.

Env vars backend requeridas:

- `DJANGO_SETTINGS_MODULE=config.settings_production`
- `DJANGO_SECRET_KEY`
- `DATABASE_URL`
- `DATABASE_SSL_REQUIRE=1`
- `DJANGO_ALLOWED_HOSTS=<API_HOST>`
- `CORS_ALLOWED_ORIGINS=https://<WEB_HOST>`
- `CORS_ALLOWED_ORIGIN_REGEXES` (`^https://.*\.vercel\.app$` solo para preview)
- `CSRF_TRUSTED_ORIGINS=https://<WEB_HOST>`
- `SUPABASE_STORAGE_ENABLED=1`
- `SUPABASE_STORAGE_BUCKET=<SUPABASE_STORAGE_BUCKET>`
- `SUPABASE_S3_ENDPOINT_URL=https://<SUPABASE_PROJECT_REF>.storage.supabase.co/storage/v1/s3`
- `SUPABASE_S3_REGION_NAME=sa-east-1`
- `SUPABASE_S3_ACCESS_KEY_ID`
- `SUPABASE_S3_SECRET_ACCESS_KEY`
- `SUPABASE_STORAGE_QUERYSTRING_AUTH=1`
- `SUPABASE_STORAGE_LOCATION=media`
- `VAPID_PRIVATE_KEY` (secreto, generado con `npx web-push generate-vapid-keys`)
- `VAPID_PUBLIC_KEY` (debe coincidir exactamente con `NEXT_PUBLIC_VAPID_PUBLIC_KEY` del frontend)
- `VAPID_CLAIMS_EMAIL=mailto:<contacto-soporte>`

Env vars frontend requeridas:

- `NEXT_PUBLIC_API_URL=https://<API_HOST>/api`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (igual a `VAPID_PUBLIC_KEY` del backend)

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

Ejecutar `seed_demo` solo para entornos demo y solo despues de confirmar la base de datos destino. El workflow de deploy de GitHub Actions nunca ejecuta `seed_demo`. Si asegura el superusuario de Django admin de forma idempotente con `manage.py ensure_superuser` (lo crea solo si no existe; nunca resetea el password) usando los secrets `DJANGO_SUPERUSER_*`.

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
- `DJANGO_SUPERUSER_USERNAME` en el entorno `demo-production`
- `DJANGO_SUPERUSER_PASSWORD` en el entorno `demo-production`
- `DJANGO_SUPERUSER_EMAIL` en el entorno `demo-production` (opcional)

Los secretos de runtime backend no se duplican en GitHub. El workflow usa `config.settings_migrations` para el paso de migracion de base de datos y deja el runtime env completo en el proyecto Vercel API.

Orden de deploy:

1. Checks backend y frontend.
2. `python backend/manage.py migrate --plan`.
3. `python backend/manage.py migrate --noinput`.
4. `python backend/manage.py ensure_superuser` (crea el admin si no existe).
5. Pull de configuracion del proyecto backend en Vercel.
6. Deploy productivo del proyecto backend en Vercel.
7. Pull de configuracion del proyecto frontend en Vercel.
8. Deploy productivo del proyecto frontend en Vercel.
9. Smoke test contra `https://<WEB_HOST>` y `https://<API_HOST>/api`.

No habilitar los deploys Git integrados de Vercel para `shineapp-api` al mismo
tiempo que este workflow. La raiz del repositorio contiene `vercel.json` con
`git.deploymentEnabled=false`, de modo que Vercel no cree builds paralelos desde
Git para la API. GitHub Actions es el gate de migracion y despliega con
`--cwd backend`; un deploy Git paralelo puede publicar codigo antes de que
corran las migraciones.

Las migraciones automaticas requieren migraciones Django compatibles hacia adelante. Cambios destructivos de schema, migraciones grandes de datos, renombres y agregados non-null sin defaults seguros necesitan revision manual antes de mergear a `main`.

Validado el 2026-05-18:

- `scripts/deploy/smoke-test.ps1 -WebBaseUrl https://<WEB_HOST> -ApiBaseUrl https://<API_HOST>/api`
- Login en navegador desde web publica a API publica.
- El bundle deployado de Next contiene la URL publica de API y no contiene localhost ni placeholder de API URL.
- La pagina de login de Django admin y el CSS `/static/admin/...` retornan 200.
- Logs recientes de error de Vercel para ambos proyectos no retornaron entradas.
