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

Do not add `DATABASE_URL`, Supabase S3 keys, or `DJANGO_SECRET_KEY` to GitHub. Backend runtime secrets remain in the Vercel API project and are used by Vercel during the cloud build/deploy.

## Flow

1. Checkout repo.
2. Install Python 3.12 and Node 22.
3. Install backend dependencies from `backend/requirements.txt`.
4. Install frontend dependencies with `npm ci`.
5. Install `vercel@latest`.
6. Run backend checks with local-safe settings:
   - `python -m pytest`
   - `python manage.py check`
   - `python manage.py makemigrations --check --dry-run`
7. Run frontend checks:
   - `npm run test`
   - `npm run build`
8. Pull backend project settings from Vercel using `VERCEL_BACKEND_PROJECT_ID`.
9. Deploy the backend Vercel project to production with Vercel cloud build.
10. Pull frontend project settings from Vercel using `VERCEL_FRONTEND_PROJECT_ID`.
11. Deploy the frontend Vercel project to production with Vercel cloud build.
12. Run `scripts/deploy/smoke-test.ps1` against the public web and API aliases.

The frontend deploy is after backend deploy. A backend check or deploy failure stops the job before the frontend can be deployed.

## Migration policy

The workflow does not pull backend runtime secrets into GitHub Actions and therefore does not run production migrations. Run migrations manually before or during a release that includes schema changes.

Because the backend code is deployed automatically from `main`, schema changes must be migrated manually before the deploy or be forward-compatible with the current database:

- additive tables, fields, indexes, and nullable columns are acceptable;
- code must tolerate old and new schema during the short deploy window;
- destructive migrations, large backfills, renames, and non-null additions without defaults require manual review and an explicit rollout plan.

The workflow never runs `seed_demo` and never creates superusers.

## Safeguards

- A concurrency group allows only one demo deploy to run at a time.
- Required GitHub secrets are checked before installing dependencies.
- Backend runtime secrets stay in Vercel and are not exported into the GitHub job.
- Local backend/frontend checks run before any production deploy.
- Smoke tests run after both deployments.
- The workflow does not print secret values and does not commit generated `.vercel` files.

## Before enabling

Confirm that Vercel built-in Git deployments are disabled or configured not to deploy these projects independently on `main`. Otherwise Vercel may deploy from Git in parallel with the GitHub Actions smoke-test path, creating duplicate production deploys and confusing rollout evidence.
