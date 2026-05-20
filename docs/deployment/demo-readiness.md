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

## Phase 1 Sellable Demo Evidence

- Trial signup exists as public `POST /api/auth/trial-signup/` in `backend/config/urls.py`. `TrialSignupSerializer` creates `BusinessAccount`, `BusinessProfile` with `subscription_type=trial`, trial dates, employer group membership and `UserProfile`; `TrialSignupView` returns a token and user context.
- The login UI has a trial mode in `frontend/lib/page-support.tsx`. It calls `/auth/trial-signup/`, stores the returned token and enters the app without an extra login step.
- `GET /api/auth/me/` returns the same backend-owned tenant context: business, role, `can_view_economy`, `subscription_type`, trial dates and trial status.
- Employers can create employee users through `POST /api/auth/employees/`; created employees get role `empleado`, can log in and receive `can_view_economy=false`.
- Economy remains backend-gated. `can_view_economy` is true only for `empleador`; finance/cash/debt/quote/material/supplier/tool history endpoints are covered by employee `403` tests. The frontend also hides employer/economy sections from employee users.
- No account blocking on expired trials is implemented yet by design. `trial_expired` is informational in Phase 1.
- No Stripe, billing portal, real plans or payment automation exists in Phase 1. `subscription_type` is an internal/demo state and must not be sold as billing.

## Demo-Day End-to-End Smoke

Run this before a sales walkthrough after deploying signup changes, rotating demo credentials, or changing auth/env vars.

1. Open `https://shineapp-web.vercel.app`.
2. Choose `Solicitar prueba`.
3. Create a throwaway trial business with non-customer data:
   - business: `Demo Trial <date>`
   - industry: `Detailing`
   - owner: `Demo Owner`
   - email: a controlled disposable or plus-address
   - phone/city/country: demo-safe values
   - password: generated temporary password stored out of band
4. Expected result: the app logs in automatically. Confirm the shell loads without asking for credentials again.
5. Confirm backend tenant context with the returned/stored token:

   ```powershell
   $ApiRoot = "https://shineapp-api.vercel.app/api"
   $Token = "<trial-owner-token>"
   Invoke-RestMethod "$ApiRoot/auth/me/" -Headers @{ Authorization = "Token $Token" }
   ```

   Expected: business slug/name belongs to the new trial business, role is `empleador`, `can_view_economy` is `true`, `subscription_type` is `trial`, and `trial_ends_at` is present.
6. In the app, go to settings/users and create one employee:
   - username: `demo-operario-<date>`
   - password: generated temporary password stored out of band
   - email: blank or controlled test email
7. Log out and log in as that employee. Expected: role `empleado`; economy/settings surfaces are not available in the UI.
8. Confirm backend economy blocking for the employee token:

   ```powershell
   $EmployeeToken = "<employee-token>"
   try {
       Invoke-WebRequest "$ApiRoot/cash/daily/" -Headers @{ Authorization = "Token $EmployeeToken" } -UseBasicParsing
   } catch {
       [int]$_.Exception.Response.StatusCode
   }
   ```

   Expected: `403` with the permissions message for economic information.
9. After the walkthrough, rotate/delete the throwaway employee credentials and either keep or deactivate the trial business depending on the sales follow-up.

## Free Tier Limitations

- Supabase free tier is acceptable for demo but should not be treated as production durability.
- Vercel serverless is acceptable for low-traffic demo, not for persistent workers or long jobs.
- Storage S3 access keys bypass RLS and must remain backend-only.

## Before Showing Customers

- Use `https://shineapp-web.vercel.app` as the public demo URL.
- Verify `/api/health/` before a live demo if the API has been redeployed.
- Run `scripts/deploy/smoke-test.ps1` if any Vercel env var changes.
- Run the Demo-Day End-to-End Smoke above after any auth, signup or role/permission change.
- Validate one upload/logo/document flow or perform the manual media test in `manual-steps.md` before demoing media/PDF flows.
- Confirm demo credentials out of band and confirm they are temporary. Do not show or paste real passwords in the call.
- If using seeded demo users, prefer rotated `admin`, `empleado` and `recepcion` passwords. Do not use default passwords for customer-facing demos unless the database is disposable and the risk was accepted explicitly.
- Present the trial as a no-card, no-charge operational trial. Do not describe `subscription_type` as customer billing.
- Delete the accidental Vercel project named `backend` to avoid operational confusion.

## Known Demo Risks

- HSTS preload/subdomains are intentionally not enabled until final domains are confirmed.
- Private media URLs depend on signed S3 URLs; validate logo/avatar/document flows after deploy.
- No background worker exists for long-running work.
- Vercel serverless is acceptable for this demo, not a persistent Django server.
- Preview env setup is not fully normalized because Vercel required a git branch for some preview env writes. Production demo env vars are configured.
- An accidental Vercel project named `backend` was created during the first failed deploy attempt. It should be removed manually from the Vercel Dashboard if no longer needed.
