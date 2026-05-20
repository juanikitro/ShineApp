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

## 8.1 Refresh demo seed credentials for customer walkthroughs

- What: if seeded demo users are used in a customer walkthrough, rotate `admin`, `empleado` and `recepcion` away from default demo passwords.
- Where: trusted local shell with the intended demo `DATABASE_URL`, or an approved one-off command that points to the demo Supabase database.
- Why: `seed_demo` can create useful realistic data, but the default local credentials are known development credentials and should not be used as long-lived public demo access.
- Value to set: generated temporary passwords outside the repo.
- Command shape:

  ```powershell
  cd backend
  $env:SEED_DEMO_ADMIN_PASSWORD = "<generated-admin-password>"
  $env:SEED_DEMO_EMPLOYEE_PASSWORD = "<generated-employee-password>"
  .\.venv\Scripts\python.exe manage.py seed_demo --yes
  ```

  If `backend/.venv` is unavailable, use `py -3 manage.py seed_demo --yes`.
- Validate:
  - `admin` can log in from the public web URL.
  - `empleado` can log in but cannot see economy/settings surfaces.
  - `GET /api/auth/me/` with each token returns the expected business, role and `can_view_economy`.
  - `GET /api/cash/daily/` with the employee token returns HTTP 403.
- Risk if omitted: a customer-facing demo can keep well-known demo passwords alive.
- Note: use `--allow-default-passwords` only for disposable local/demo smoke runs where the risk is explicit. Do not use it as the normal customer-demo path.

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
- Where: GitHub repository settings, Secrets and variables, Actions; and the `demo-production` environment.
- Why: GitHub Actions needs Vercel CLI credentials, the two Vercel project ids, and a narrow DB migration credential set.
- Repository secrets to set:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID=team_SU2ZYRqjIjG8JhFn2pc1NVxi`
  - `VERCEL_FRONTEND_PROJECT_ID=prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`
  - `VERCEL_BACKEND_PROJECT_ID=prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`
- Environment secrets to set in `demo-production`:
  - `DATABASE_URL`
  - `DJANGO_MIGRATION_SECRET_KEY`
- Optional environment secret:
  - `SMOKE_TEST_TOKEN` if smoke tests should verify an authenticated endpoint.
- Environment deployment branches:
  - only `main`.
- Validate: run the workflow manually with `workflow_dispatch`; it should pass the initial secret check, run local checks, run migrations, deploy both Vercel projects, and pass smoke tests.
- Risk if omitted: the deploy workflow fails before installing dependencies.

Do not add the real `DJANGO_SECRET_KEY`, Supabase S3 keys, or SMTP secrets to GitHub. Those values belong in the Vercel API project production env and are consumed by Vercel during the cloud build/deploy.

## 12. Protect `main`

- What: enforce PR-only changes and require the CI gate before merge.
- Where: GitHub repository settings, Branches or Rulesets.
- Why: every PR to `main` must pass the same full gate before it can deploy.
- Values to set:
  - Require a pull request before merging.
  - Require status checks to pass before merging: `Validate / ci-required`.
  - Require merge queue, or require branches to be up to date before merging if merge queue is unavailable.
  - Require conversation resolution before merging.
  - Do not allow bypassing the above settings.
  - Disallow force pushes and branch deletions.
- Validate: open or inspect a PR targeting `main`; GitHub should block merge until `Validate / ci-required` succeeds on the latest commit or merge queue group.
- Risk if omitted: direct pushes or stale PRs can reach `main` and trigger production deploy without the full gate.

## 13. Make GitHub Actions the only automatic production deploy path

- What: disable or bypass Vercel built-in Git production deploys for `shineapp-api` and `shineapp-web`, or configure them to skip when GitHub Actions is responsible for production.
- Where: Vercel Dashboard, project Git settings / ignored build step.
- Why: the GitHub Actions workflow deploys backend, runs migrations, then deploys frontend. A parallel Vercel Git deploy can publish backend code before the migration gate runs.
- Value to copy: none.
- Validate: push a harmless change to a test branch or inspect Vercel project settings before merging to `main`; production deploys should be created by the GitHub Actions CLI workflow, not an independent Vercel Git trigger.
- Risk if omitted: duplicate deploys, race conditions, or code live before Supabase schema is migrated.

## 14. Review migration risk before merging schema changes to `main`

- What: check whether the PR contains schema or data migrations.
- Where: PR review and `backend/*/migrations/`.
- Why: the GitHub Actions deploy runs `migrate --plan` and `migrate --noinput` automatically before Vercel production deploy.
- Value to copy: none.
- Validate: the workflow migration step succeeds, then `https://shineapp-api.vercel.app/api/health/` returns `database=ok`.
- Risk if omitted: destructive migrations, renames, large backfills, or unsafe non-null changes can break the public demo automatically.

Forward-compatible migrations are acceptable for the automated demo release path. Destructive migrations need a manual rollout plan and should not be merged into `main` as a routine demo deploy.

## 15. Separate staging and real production

- What: create separate Vercel web/API projects, Supabase projects, Storage buckets, Sentry environments, and GitHub environments for `staging` and `production`.
- Where: Vercel, Supabase, Sentry, and GitHub repository settings.
- Why: the current `shineapp-web`, `shineapp-api`, and `demo-production` path are demo resources and must not hold real customer data.
- Value to copy: no shared secrets; each environment gets its own generated `DJANGO_SECRET_KEY`, `DATABASE_URL`, S3 keys, Sentry DSN, and frontend API URL.
- Validate: `verify-env.ps1 -Production` passes against the production env shape, and staging/prod dashboards show different project ids, database refs, buckets, domains, and DSNs.
- Risk if omitted: test/demo data, secrets, observability, and rollback evidence can cross-contaminate real customers.

## 16. Configure Sentry and WAF before real traffic

- What: create the backend Sentry project and configure Vercel Firewall/WAF rate-limit rules.
- Where: Sentry project settings and Vercel Dashboard, Firewall section for the real API project.
- Why: production must capture backend exceptions and limit abusive public traffic before customer access.
- Values to set:
  - `SENTRY_DSN=<backend-sentry-dsn>`
  - `SENTRY_ENVIRONMENT=production`
  - `SENTRY_TRACES_SAMPLE_RATE=0.05` initially
  - `SENTRY_SEND_DEFAULT_PII=0`
  - `WAF_PROVIDER=vercel`
  - `WAF_STATUS=configured` only after rules are active
- WAF rules to configure:
  - stricter limit for `/api/auth/login/`
  - stricter limit for `/api/public/landing/*/requests/`
  - general limit or challenge policy for `/api/*`
- Validate: `verify-env.ps1 -Production` rejects the env until Sentry and WAF status are configured; Sentry receives a controlled test exception from a non-customer environment.
- Risk if omitted: production errors become invisible and public endpoints remain easier to abuse.

## 17. Rotate secrets for production cutover

- What: rotate every demo/shared credential before first real customer data.
- Where: Vercel project env vars, Supabase Dashboard, GitHub environments, Sentry, and any email provider.
- Values to rotate:
  - `DJANGO_SECRET_KEY`
  - Supabase database password or pooler credential if it was shared during setup
  - `SUPABASE_S3_ACCESS_KEY_ID` and `SUPABASE_S3_SECRET_ACCESS_KEY`
  - demo app passwords and any Django admin password
  - `DJANGO_MIGRATION_SECRET_KEY`
  - `VERCEL_TOKEN` if it was broadly scoped or shared
- Validate: redeploy/restart approved runtime only after rotation, then run healthcheck, login, authenticated smoke, and media smoke.
- Risk if omitted: demo-era credentials become long-lived production credentials.

## 18. Rollback, migration, and media smoke gate

- What: before each production release, document rollback owner, last known good deployment, database backup/restore point, and migration risk.
- Where: release checklist or PR description before merging to the production deploy path.
- Required checks:
  - review `python manage.py migrate --plan`
  - confirm migrations are forward-compatible, or write a manual rollout/rollback plan
  - confirm no seed/demo command runs against production
  - record the previous Vercel deployment URL or container image tag
  - run `scripts/deploy/smoke-test.ps1` with web/API URLs
  - if a test media URL exists, include `-MediaUrl <signed-or-public-media-url>`
  - manually upload a logo/avatar/document, reload, and confirm the generated quote PDF renders the logo
- Validate: release notes contain the migration/rollback decision and smoke evidence before client traffic is pointed at the deployment.
- Risk if omitted: schema changes and media regressions can be discovered only after customer use.
