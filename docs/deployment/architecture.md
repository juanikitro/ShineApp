# Deployment Architecture

## Repo shape

ShineApp stays as a simple monorepo:

```text
repo/
  backend/   # Django + DRF API
  frontend/  # Next.js App Router
  scripts/
  docs/
```

This is equivalent to `apps/api` + `apps/web` without the churn of moving files. Vercel can create two projects from the same repository by setting a different Root Directory per project.

## Demo architecture

- Web: Vercel project `shineapp-web`, Root Directory `frontend`, framework Next.js, build command `npm run build`.
- API: Vercel project `shineapp-api`, Root Directory `backend`, Python runtime, WSGI entrypoint `wsgi.py`.
- Database: Supabase Postgres via `DATABASE_URL`. For Vercel serverless, prefer the Supabase transaction pooler URL.
- Media: Supabase Storage through the S3-compatible API. Do not rely on local filesystem for uploads.
- Static:
  - Next assets are built and served by Vercel.
  - Django admin/static assets are collected with `collectstatic` and served by WhiteNoise.

## Serverless limits accepted for demo

Django on Vercel is acceptable for a sales demo because traffic is low and the app is request/response oriented. It is not a persistent server: no local uploads, no long-running jobs, no background workers, and no assumptions about warm processes.

## Future paid production

Keep Next.js on Vercel. If PDF generation, background work, upload volume, or DB connection pressure grows, move Django to a persistent container platform while keeping Supabase Postgres and Storage. Add backups, observability, custom domains, rate limits, and a stricter release workflow before real production traffic.
