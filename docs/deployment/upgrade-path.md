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
- Configure Sentry through `SENTRY_DSN` and keep `SENTRY_SEND_DEFAULT_PII=0` unless privacy review approves otherwise.
- Configure rate limiting and WAF rules on public endpoints; set `WAF_STATUS=configured` only after dashboard rules are active.
- Replace browser-readable token auth with HttpOnly/SameSite cookies or Django session auth plus CSRF, token/session expiry, rotation and server-side revocation.
- Keep Django on Vercel only for initial production traffic that stays request/response oriented and low concurrency.
- Add a release checklist for migrations, rollback, seed/demo data, and smoke tests.
- Separate staging and production projects before real customer data.
- Add secret rotation for Vercel env vars and Supabase S3 keys.
- Add explicit bucket access review before switching any bucket to public.
- Replace default demo passwords and decide whether a real Django admin superuser is needed.
- Delete unused/accidental Vercel projects to avoid operational drift.

Move Django off serverless and into a persistent container before accepting workloads with long PDF generation, queues, websocket-style persistence, heavy uploads, scheduled workers, high DB connection concurrency, or background processing. If any of those are needed for the first real client, the container move is a launch blocker rather than a later optimization.
