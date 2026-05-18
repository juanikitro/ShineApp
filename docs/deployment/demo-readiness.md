# Demo Readiness

Status: ready for a public sales demo with limits. Supabase, Vercel web, Vercel API, migrations, demo seed, healthcheck, login, DB-backed API calls, Next static assets, and Django admin static files were validated on 2026-05-18.

## Resources

- Vercel frontend project: `shineapp-web` (`prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`), linked locally
- Vercel backend project: `shineapp-api` (`prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`), linked locally
- Vercel team: `juanikitros-projects` (`team_SU2ZYRqjIjG8JhFn2pc1NVxi`)
- Supabase project: `shineapp-demo` (`cdzqcpwbsfyeeigecqwr`)
- Supabase region: `sa-east-1`
- Supabase URL: `https://cdzqcpwbsfyeeigecqwr.supabase.co`
- Storage bucket: `shineapp-media`, private

## URLs

- Frontend production URL: `https://shineapp-web.vercel.app`
- Backend production URL: `https://shineapp-api.vercel.app`
- Backend healthcheck: `https://shineapp-api.vercel.app/api/health/`
- Latest frontend deployment inspected: `dpl_3HtxEZCLGEh8B7gPxWTKTfULuJUK`
- Latest backend deployment inspected: `dpl_4DqrsccG8GP6WqPDGtAUsd7ZW7BY`

## Current State

- DB: `GET /api/health/` returns `status=ok` and `database=ok` against Supabase.
- Migrations: applied to the demo Supabase database on 2026-05-18.
- Storage/media: private bucket `shineapp-media` exists and S3 `head_bucket` returned OK. UI upload flows still need a manual demo test before selling media-heavy workflows.
- Vercel env vars: production env vars are configured for both projects. Preview env vars may need branch-scoped setup from the Dashboard if preview deployments are used again.
- Demo seed: applied against Supabase on 2026-05-18. App demo users `admin` and `empleado` are ready. No Django admin superadmin was created by this run.
- Static: Next static assets return 200; Django admin page returns 200; Django admin CSS under `/static/admin/...` returns 200.
- Healthcheck: backend exposes public `GET /api/health/`, including DB connection check.
- Browser smoke: public frontend logs in through the public backend and loads DB-backed resources with 200 responses.
- Demo user: local docs mention demo usernames and default demo passwords; share actual credentials out of band and rotate them before real production.

## Free Tier Limitations

- Supabase free tier is acceptable for demo but should not be treated as production durability.
- Vercel serverless is acceptable for low-traffic demo, not for persistent workers or long jobs.
- Storage S3 access keys bypass RLS and must remain backend-only.

## Before Showing Customers

- Use `https://shineapp-web.vercel.app` as the public demo URL.
- Verify `/api/health/` before a live demo if the API has been redeployed.
- Run `scripts/deploy/smoke-test.ps1` if any Vercel env var changes.
- Validate one upload/logo/document flow or perform the manual media test in `manual-steps.md` before demoing media/PDF flows.
- Confirm demo credentials out of band.
- Delete the accidental Vercel project named `backend` to avoid operational confusion.

## Known Demo Risks

- HSTS preload/subdomains are intentionally not enabled until final domains are confirmed.
- Private media URLs depend on signed S3 URLs; validate logo/avatar/document flows after deploy.
- No background worker exists for long-running work.
- Vercel serverless is acceptable for this demo, not a persistent Django server.
- Preview env setup is not fully normalized because Vercel required a git branch for some preview env writes. Production demo env vars are configured.
- An accidental Vercel project named `backend` was created during the first failed deploy attempt. It should be removed manually from the Vercel Dashboard if no longer needed.
