# Manual Steps After Public Demo

The public demo is deployed. These manual steps remain before showing media-heavy flows to customers or treating the setup as production.

## 1. Create Supabase project

- What: create a dedicated demo project. Done: `shineapp-demo` / `cdzqcpwbsfyeeigecqwr`.
- Where: Supabase Dashboard.
- Why: demo/prod data must not use local SQLite or Docker Postgres.
- Value to copy: project ref, region, database connection string.
- Validate: Supabase project dashboard loads and database connection info is available.

## 2. Copy `DATABASE_URL`

- What: copy the Postgres URL for the API. Done for the public demo.
- Where: Supabase Dashboard, Connect section.
- Why: Django production settings require `DATABASE_URL`.
- Value to copy: pooler connection string, preferably transaction pooler for Vercel.
- Validate: `https://shineapp-api.vercel.app/api/health/` returns `database=ok`.

## 3. Create Storage bucket

- What: create `shineapp-media`. Done as a private bucket.
- Where: Supabase Storage.
- Why: uploaded logos, avatars, and documents must persist outside the Vercel filesystem.
- Value to copy: bucket name.
- Validate: bucket appears in Storage and accepts a test upload.

## 4. Enable Storage S3 and create server keys

- What: create S3 access key id and secret. Done manually for the public demo.
- Where: Supabase Storage S3 settings.
- Why: Django uses `django-storages` through Supabase's S3-compatible API.
- Value to copy: endpoint URL, region, access key id, secret key.
- Validate: Vercel API env vars include all `SUPABASE_S3_*` values.
- Note: rotate demo secrets before production because initial values were shared through chat during setup.

## 5. Configure Vercel web project

- What: create `shineapp-web`. Done: `prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`.
- Where: Vercel Dashboard.
- Why: deploy Next.js separately from the Django API.
- Value to set: Root Directory `frontend`, `NEXT_PUBLIC_API_URL=https://shineapp-api.vercel.app/api`.
- Validate: `https://shineapp-web.vercel.app` returns 200 and the deployed bundle contains `shineapp-api.vercel.app/api`, not localhost or placeholders.

## 6. Configure Vercel API project

- What: create `shineapp-api`. Done: `prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`.
- Where: Vercel Dashboard.
- Why: run Django API as a Python serverless app for demo.
- Value to set: Root Directory `backend`, `DJANGO_SETTINGS_MODULE=config.settings_production`, database, CORS/CSRF, Supabase Storage, email env vars.
- Validate: Vercel project settings show root `backend`; `https://shineapp-api.vercel.app/api/health/` returns `status=ok`; no secret is visible in repo files.

## 7. Confirm final domains

- What: decide actual web and API domains. Current demo domains are Vercel-provided aliases.
- Where: Vercel project domains.
- Why: host allowlists and browser CORS/CSRF depend on exact origins.
- Values to set:
  - `DJANGO_ALLOWED_HOSTS=shineapp-api.vercel.app`
  - `CORS_ALLOWED_ORIGINS=https://shineapp-web.vercel.app`
  - `CSRF_TRUSTED_ORIGINS=https://shineapp-web.vercel.app`
  - `NEXT_PUBLIC_API_URL=https://shineapp-api.vercel.app/api`
- Validate: no localhost value remains in production Vercel env vars.

## 7.1 Configure Vercel preview env vars if preview deploys are needed

- What: add all preview env vars listed in `docs/deployment/vercel.md`.
- Where: Vercel Dashboard, project settings, Environment Variables.
- Why: production demo env vars are configured, but preview writes may require a git branch in Vercel.
- Value to copy: values from Supabase Dashboard and generated backend secrets. Do not copy secrets into repo files.
- Validate: `npx vercel env ls --cwd backend` and `npx vercel env ls --cwd frontend` show the required variable names.

## 7.2 Public demo URLs

- What: public demo aliases are now assigned.
- Where: Vercel Dashboard, projects `shineapp-api` and `shineapp-web`.
- Why: customers need an unauthenticated URL.
- Value to copy: frontend `https://shineapp-web.vercel.app`; API `https://shineapp-api.vercel.app`.
- Validate: `scripts/deploy/smoke-test.ps1 -WebBaseUrl https://shineapp-web.vercel.app -ApiBaseUrl https://shineapp-api.vercel.app/api` returns OK from a normal unauthenticated request.
- Risk if changed incorrectly: frontend login can break if `NEXT_PUBLIC_API_URL`, CORS, or CSRF no longer match.

## 7.3 Clean accidental Vercel project

- What: remove the unintended Vercel project named `backend` if it is unused.
- Where: Vercel Dashboard, project `backend`.
- Why: a first failed CLI deploy linked the backend folder to a new project before it was relinked to `shineapp-api`.
- Value to copy: none.
- Validate: Vercel project list only shows `shineapp-api` and `shineapp-web` for this demo.
- Risk if omitted: operational confusion, but no app data risk was identified.

## 8. Run migrations and optional demo seed

- What: run `migrate`; optionally `seed_demo`. Done for demo DB on 2026-05-18 with `seed_demo --yes --allow-default-passwords`.
- Where: trusted local shell or approved one-off command with production env.
- Why: schema and demo data should be created intentionally, not during every serverless cold start.
- Value to copy: none.
- Validate: admin/API can authenticate against the Supabase database after public API alias is enabled.

## 9. Validate private media

- What: upload a logo/avatar/document after public deploy.
- Where: ShineApp UI against `https://shineapp-web.vercel.app`.
- Why: private Supabase bucket uses signed S3 URLs, not public object URLs.
- Value to copy: none.
- Validate: uploaded file persists after reload and generated quote PDF can render the business logo.
- Risk if omitted: the demo may look fine until the first media upload/display flow.

## 10. Rotate demo secrets before real production

- What: rotate `DJANGO_SECRET_KEY`, Supabase database password if needed, and Supabase S3 access keys.
- Where: Supabase Dashboard and Vercel Dashboard.
- Why: initial demo secrets were handled interactively during setup and should not become long-lived production secrets.
- Value to copy: new values only into Vercel backend env vars.
- Validate: redeploy API, run healthcheck, login, and media validation.
- Risk if omitted: avoidable secret exposure risk in a future commercial environment.

## 11. Configure GitHub Actions deploy secrets

- What: add the required CI/CD secrets for `.github/workflows/deploy-vercel-demo.yml`.
- Where: GitHub repository settings, Secrets and variables, Actions.
- Why: GitHub Actions needs Vercel CLI credentials and the two Vercel project ids, but should not store application runtime secrets.
- Values to set:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID=team_SU2ZYRqjIjG8JhFn2pc1NVxi`
  - `VERCEL_FRONTEND_PROJECT_ID=prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`
  - `VERCEL_BACKEND_PROJECT_ID=prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`
- Validate: run the workflow manually with `workflow_dispatch`; it should pass the initial secret check, pull production env from both Vercel projects, deploy both projects, run migrations, and pass smoke tests.
- Risk if omitted: the deploy workflow fails before installing dependencies.

Do not add `DATABASE_URL`, `DJANGO_SECRET_KEY`, Supabase S3 keys, or SMTP secrets to GitHub while `vercel pull` works. Those values belong in the Vercel API project production env and are loaded into the CI job only for checks and migrations.

## 12. Make GitHub Actions the only automatic production deploy path

- What: disable or bypass Vercel built-in Git production deploys for `shineapp-api` and `shineapp-web`, or configure them to skip when GitHub Actions is responsible for production.
- Where: Vercel Dashboard, project Git settings / ignored build step.
- Why: the GitHub Actions workflow deploys backend, runs migrations, then deploys frontend. A parallel Vercel Git deploy can publish backend code before the migration gate runs.
- Value to copy: none.
- Validate: push a harmless change to a test branch or inspect Vercel project settings before merging to `main`; production deploys should be created by the GitHub Actions CLI workflow, not an independent Vercel Git trigger.
- Risk if omitted: duplicate deploys, race conditions, or code live before Supabase schema is migrated.

## 13. Review migration risk before merging to `main`

- What: check whether the PR contains schema or data migrations.
- Where: PR review and `backend/*/migrations/`.
- Why: CI prints `python backend/manage.py migrate --plan` and then applies `python backend/manage.py migrate --noinput` automatically on `main`.
- Value to copy: none.
- Validate: migration plan is additive and compatible with both old and new deployed code.
- Risk if omitted: destructive migrations, renames, large backfills, or unsafe non-null changes can break the public demo automatically.

Forward-compatible migrations are acceptable for auto-deploy. Destructive migrations need a manual rollout plan and should not be merged into `main` as a routine demo deploy.
