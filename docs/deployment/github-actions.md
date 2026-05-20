# GitHub Actions CI/CD

ShineApp uses GitHub Actions as the only approved automated production-demo path. Pull requests to `main` run without secrets. Merges to `main` run migrations against Supabase and deploy both Vercel projects.


## Pull request gate

Workflow: `.github/workflows/validate.yml`.

Triggers:

- `pull_request` targeting `main`
- `merge_group`
- `push` to `main` and `development`

Required branch protection check:

- `Validate / ci-required`

The `ci-required` job is the only check that should be required in branch protection. It waits for the real jobs and fails if any required job fails, is cancelled, or is skipped.

Jobs:

- `backend`: installs Python 3.12 dependencies, runs `manage.py check`, `makemigrations --check --dry-run`, and backend tests with `pytest --cov`.
- `frontend`: installs Node 22 dependencies with `npm ci`, runs `npm run test:coverage`, `npm run build`, and `npm audit --omit=dev`.
- `dependency-audit`: installs `pip-audit==2.10.0` and audits `backend/requirements.txt`.
- `codeql`: runs CodeQL v4 for Python and JavaScript/TypeScript.
- `ci-required`: summarizes the required jobs and provides the single required status check.

PR jobs do not receive Vercel, Supabase, storage, SMTP, or Django production secrets.

## Main deploy

Workflow: `.github/workflows/deploy-vercel-demo.yml`.

Triggers:

- `push` to `main`
- `workflow_dispatch`

Environment:

- `demo-production`

The workflow deploys automatically after merge to `main`. The environment should restrict deployment branches to `main`, but it should not require manual reviewers while the chosen policy is automatic deploy.

Required GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_FRONTEND_PROJECT_ID`
- `VERCEL_BACKEND_PROJECT_ID`

Required `demo-production` environment secrets:

- `DATABASE_URL`
- `DJANGO_MIGRATION_SECRET_KEY`

Optional `demo-production` environment secret:

- `SMOKE_TEST_TOKEN`

Backend runtime secrets stay in the Vercel API project. Do not duplicate `DJANGO_SECRET_KEY`, Supabase S3 keys, or SMTP secrets into GitHub unless a future workflow explicitly needs a narrower deploy-time credential.


## Deploy order

1. Validate required GitHub secrets.
2. Install Python 3.12 and Node 22.
3. Install backend and frontend dependencies.
4. Run backend checks: Django system check, migration drift check, backend coverage gate.
5. Run Python dependency audit with `pip-audit==2.10.0`.
6. Run frontend coverage gate, Next build, and production dependency audit.
7. Run Django migration plan against Supabase with `config.settings_migrations`.
8. Apply Django migrations with `migrate --noinput`.
9. Install `vercel@54.2.0`.
10. Pull backend Vercel project settings and deploy `shineapp-api` to production.
11. Pull frontend Vercel project settings and deploy `shineapp-web` to production.
12. Smoke test `https://shineapp-web.vercel.app` and `https://shineapp-api.vercel.app/api`.

If migrations fail, Vercel deploy does not run. If backend deploy fails, frontend deploy does not run. If smoke tests fail, the workflow fails after deployment and the deployment must be triaged before another production change.

## Migration policy

The deploy workflow runs migrations automatically before Vercel production deploys. Schema changes merged to `main` must be forward-compatible with the currently live code:

- additive tables, fields, indexes, and nullable columns are acceptable;
- code must tolerate old and new schema during the short deploy window;
- destructive migrations, large backfills, renames, and non-null additions without safe defaults require manual review and an explicit rollout plan.

The workflow never runs `seed_demo` and never creates superusers.

## Repository settings

Protect `main` with:

- Require a pull request before merging.
- Require status checks to pass before merging: `Validate / ci-required`.
- Require merge queue, or require branches to be up to date before merging if merge queue is unavailable.
- Require conversation resolution before merging.
- Do not allow bypassing the above settings.
- Disallow force pushes and branch deletions.

If merge queue is enabled, keep the `merge_group` trigger in `validate.yml`; otherwise queued merges can fail because required checks are never reported.

## Vercel settings

Disable Vercel built-in Git production deploys for both projects, or configure ignored build steps so Git pushes do not create independent production deploys. GitHub Actions is the migration gate; a parallel Vercel Git deploy can publish code before Supabase schema is migrated.

Approved production-demo aliases:

- Web: `https://shineapp-web.vercel.app`
- API: `https://shineapp-api.vercel.app/api`
