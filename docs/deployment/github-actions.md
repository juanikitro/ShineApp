# GitHub Actions Demo Deploy

This repo deploys the public demo through `.github/workflows/deploy-vercel-demo.yml`.

## Trigger

- `push` to `main`
- manual `workflow_dispatch`

The workflow is intentionally production-only for the demo aliases:

- Web: `https://shineapp-web.vercel.app`
- API: `https://shineapp-api.vercel.app/api`

## Required GitHub secrets

Configure these in the GitHub repository before enabling `main` auto-deploy:

- `VERCEL_TOKEN`: Vercel token used by the CLI in CI.
- `VERCEL_ORG_ID`: Vercel team/org id, currently `team_SU2ZYRqjIjG8JhFn2pc1NVxi`.
- `VERCEL_FRONTEND_PROJECT_ID`: Vercel project id for `shineapp-web`, currently `prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`.
- `VERCEL_BACKEND_PROJECT_ID`: Vercel project id for `shineapp-api`, currently `prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`.

Do not add `DATABASE_URL`, Supabase S3 keys, or `DJANGO_SECRET_KEY` to GitHub unless the Vercel pull path is unavailable. Backend runtime secrets should remain in the Vercel API project and are pulled by the workflow from the production environment.

## Flow

1. Checkout repo.
2. Install Python 3.12 and Node 22.
3. Install backend dependencies from `backend/requirements.txt`.
4. Install frontend dependencies with `npm ci`.
5. Install `vercel@latest`.
6. Pull backend production env from Vercel using `VERCEL_BACKEND_PROJECT_ID`.
7. Export the pulled backend env to the job environment without printing values.
8. Run backend checks:
   - `python backend/manage.py check --deploy`
   - `python backend/manage.py makemigrations --check --dry-run`
9. Build and deploy the backend Vercel project to production.
10. Print `python backend/manage.py migrate --plan`.
11. Run `python backend/manage.py migrate --noinput`.
12. Pull frontend production env from Vercel using `VERCEL_FRONTEND_PROJECT_ID`.
13. Run frontend tests with `npm run test`.
14. Build and deploy the frontend Vercel project to production.
15. Run `scripts/deploy/smoke-test.ps1` against the public web and API aliases.

The frontend deploy is after backend deploy and migrations. A backend failure or migration failure stops the job before the frontend can be deployed.

## Migration policy

The workflow prints the migration plan on every run and applies migrations on the configured production-demo events: push to `main` and manual dispatch.

Because the backend code is deployed before migrations, schema changes merged to `main` must be forward-compatible:

- additive tables, fields, indexes, and nullable columns are acceptable;
- code must tolerate old and new schema during the short deploy window;
- destructive migrations, large backfills, renames, and non-null additions without defaults require manual review and an explicit rollout plan.

The workflow never runs `seed_demo` and never creates superusers.

## Safeguards

- A concurrency group allows only one demo deploy to run at a time.
- Required GitHub secrets are checked before installing dependencies.
- Backend env values are pulled from Vercel and masked before being exported.
- Missing required backend production env names fail the job before checks or migrations.
- Smoke tests run after both deployments.
- The workflow does not print secret values and does not commit generated `.vercel` files.

## Before enabling

Confirm that Vercel built-in Git deployments are disabled or configured not to deploy these projects independently on `main`. Otherwise Vercel may deploy from Git before the GitHub Actions migration gate runs, bypassing the intended order.
