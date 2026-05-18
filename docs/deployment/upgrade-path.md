# Upgrade Path

## Demo

- Two Vercel projects from one monorepo.
- Public URLs:
  - Web: `https://shineapp-web.vercel.app`
  - API: `https://shineapp-api.vercel.app`
- Supabase project `shineapp-demo` in `sa-east-1`.
- Supabase Postgres and private Storage bucket `shineapp-media`.
- Automated demo migrations through GitHub Actions environment `demo-production`.
- No background workers.
- No filesystem media.
- Basic smoke tests after public deploy.
- Demo seed applied with default demo credentials. Rotate before production.

## Paid production

Before real customer traffic:

- Move to Supabase Pro or equivalent backup/retention plan.
- Add custom domains for web and API.
- Configure production email provider and verified sender domain.
- Add Sentry or equivalent error tracking.
- Add rate limiting or WAF rules on public endpoints.
- Decide whether Django remains on Vercel or moves to a persistent container.
- Add a release checklist for migrations, rollback, seed/demo data, and smoke tests.
- Separate staging and production projects before real customer data.
- Add secret rotation for Vercel env vars and Supabase S3 keys.
- Add explicit bucket access review before switching any bucket to public.
- Replace default demo passwords and decide whether a real Django admin superuser is needed.
- Delete unused/accidental Vercel projects to avoid operational drift.

Move Django off serverless if the app needs long PDF work, queues, websocket-style persistence, heavy uploads, scheduled workers, or high DB connection concurrency.
