# Vercel Setup

Manual deploys or promotions still require human confirmation. The approved automated path for the public demo is the GitHub Actions workflow documented in `docs/deployment/github-actions.md`.

## Web project

- Project name: `shineapp-web`
- Project id: `prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`
- Root Directory: `frontend`
- Framework preset: Next.js
- Install command: default or `npm install`
- Build command: `npm run build`
- Output: Vercel default for Next.js
- Env vars:
  - `NEXT_PUBLIC_API_URL=https://shineapp-api.vercel.app/api` for the public demo

## API project

- Project name: `shineapp-api`
- Project id: `prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`
- Root Directory: `backend`
- Runtime: Python, pinned with `backend/.python-version` to `3.12`
- Entrypoint: `backend/wsgi.py` exposes `app`
- Install command: `python -m pip install -r requirements.txt`
- Build command: `python manage.py collectstatic --noinput`
- Env vars:
  - `DJANGO_SETTINGS_MODULE=config.settings_production`
  - all backend private vars from `docs/deployment/env-vars.md`

`backend/vercel.json` keeps install/build explicit and excludes local-only artifacts from the Python function bundle.

Healthcheck after deploy:

```text
https://shineapp-api.vercel.app/api/health/
```

It is public and verifies that Django can open a database connection.

Current public production status:

- API: `https://shineapp-api.vercel.app`, deployment `dpl_4DqrsccG8GP6WqPDGtAUsd7ZW7BY`, READY
- Web: `https://shineapp-web.vercel.app`, deployment `dpl_3HtxEZCLGEh8B7gPxWTKTfULuJUK`, READY

Production env vars are configured in Vercel for the public demo. Preview env vars may still need branch-scoped setup from the Dashboard if preview deployments are used again.

Backend env vars required:

- `DJANGO_SETTINGS_MODULE=config.settings_production`
- `DJANGO_SECRET_KEY`
- `DATABASE_URL`
- `DATABASE_SSL_REQUIRE=1`
- `DJANGO_ALLOWED_HOSTS=shineapp-api.vercel.app`
- `CORS_ALLOWED_ORIGINS=https://shineapp-web.vercel.app`
- `CORS_ALLOWED_ORIGIN_REGEXES` (`^https://.*\.vercel\.app$` only for preview)
- `CSRF_TRUSTED_ORIGINS=https://shineapp-web.vercel.app`
- `SUPABASE_STORAGE_ENABLED=1`
- `SUPABASE_STORAGE_BUCKET=shineapp-media`
- `SUPABASE_S3_ENDPOINT_URL=https://cdzqcpwbsfyeeigecqwr.storage.supabase.co/storage/v1/s3`
- `SUPABASE_S3_REGION_NAME=sa-east-1`
- `SUPABASE_S3_ACCESS_KEY_ID`
- `SUPABASE_S3_SECRET_ACCESS_KEY`
- `SUPABASE_STORAGE_QUERYSTRING_AUTH=1`
- `SUPABASE_STORAGE_LOCATION=media`

Frontend env vars required:

- `NEXT_PUBLIC_API_URL=https://shineapp-api.vercel.app/api`

## Manual migration step

Vercel build should not run migrations automatically. The GitHub Actions workflow always prints the migration plan and runs migrations only when the manual `run_migrations` input is `true`. For manual one-off deploys outside Actions, run migrations as an approved step from a trusted machine:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_production"
.\.venv\Scripts\python.exe manage.py migrate
```

Before any migration, print and review the plan:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_production"
.\.venv\Scripts\python.exe manage.py migrate --plan
```

Run `seed_demo` only for demo environments and only after confirming the target database. The GitHub Actions deploy workflow never runs `seed_demo` and never creates superusers.

## GitHub Actions CI/CD

Workflow: `.github/workflows/deploy-vercel-demo.yml`.

Triggers:

- `workflow_dispatch`

Required GitHub secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_FRONTEND_PROJECT_ID`
- `VERCEL_BACKEND_PROJECT_ID`

Backend runtime secrets are not duplicated in GitHub. The workflow uses `vercel pull --environment=production --cwd backend` with the backend project id, exports the pulled env values only inside the CI job, and masks values before later steps run.

Deployment order:

1. Backend production env pull.
2. Backend production checks and migration drift check.
3. Backend Vercel production build and deploy.
4. `python backend/manage.py migrate --plan`.
5. Optional `python backend/manage.py migrate --noinput` only when `run_migrations=true`.
6. Frontend production env pull.
7. Frontend tests.
8. Frontend Vercel production build and deploy.
9. Smoke test against `https://shineapp-web.vercel.app` and `https://shineapp-api.vercel.app/api`.

Do not enable Vercel's built-in Git production deploys for these projects at the same time as this workflow unless they are explicitly configured to skip. The GitHub Actions workflow is the manual deploy gate; a parallel Vercel Git deploy can publish code outside that path.

Migrations require forward-compatible Django migrations before enabling `run_migrations=true`. Destructive schema changes, large data migrations, renames, and non-null additions without safe defaults need manual review before running the workflow.

Validated on 2026-05-18:

- `scripts/deploy/smoke-test.ps1 -WebBaseUrl https://shineapp-web.vercel.app -ApiBaseUrl https://shineapp-api.vercel.app/api`
- Browser login from public web to public API.
- Next deployed bundle contains the public API URL and no localhost or placeholder API URL.
- Django admin login page and `/static/admin/...` CSS return 200.
- Recent Vercel error logs for both projects returned no entries.
