# Environment Variables

Do not commit real values. Use `.env.example` as shape only.

## Backend private vars

- `APP_ENVIRONMENT`: runtime label. Use `local` locally, `staging` for staging, and `production` only for real production.
- `DJANGO_SETTINGS_MODULE`: `config.settings` locally, `config.settings_production` on Vercel API.
- `DJANGO_SECRET_KEY`: secret server-side key. Production must be a real random value.
- `DJANGO_DEBUG`: `1` locally, ignored as false in production settings.
- `DJANGO_ALLOWED_HOSTS`: comma-separated API hostnames.
- `CORS_ALLOWED_ORIGINS`: comma-separated web origins allowed by the API.
- `CORS_ALLOWED_ORIGIN_REGEXES`: optional comma-separated regex origins for Vercel preview domains.
- `CSRF_TRUSTED_ORIGINS`: comma-separated trusted web origins for Django CSRF.
- `DATABASE_URL`: Supabase Postgres connection string.
- `DATABASE_SSL_REQUIRE`: `1` for Supabase production connections.
- `DJANGO_THROTTLE_ANON_RATE`: DRF anonymous throttle rate in production settings, default `60/min`.
- `DJANGO_THROTTLE_USER_RATE`: DRF authenticated throttle rate in production settings, default `600/min`.
- `SUPABASE_STORAGE_ENABLED`: `1` in demo/prod when media must persist.
- `SUPABASE_STORAGE_BUCKET`: Storage bucket for uploads.
- `SUPABASE_S3_ENDPOINT_URL`: `https://<project-ref>.storage.supabase.co/storage/v1/s3`.
- `SUPABASE_S3_REGION_NAME`: Supabase project region.
- `SUPABASE_S3_ACCESS_KEY_ID`: server-side S3 access key id.
- `SUPABASE_S3_SECRET_ACCESS_KEY`: server-side S3 secret key.
- `SUPABASE_STORAGE_QUERYSTRING_AUTH`: `0` for public bucket URLs, `1` for signed S3 URLs.
- `SUPABASE_STORAGE_PUBLIC_URL`: public object URL base when unsigned media URLs are used.
- `SUPABASE_STORAGE_LOCATION`: optional prefix inside the bucket, default `media`.
- `SENTRY_DSN`: backend Sentry DSN. Leave empty locally; required by `verify-env.ps1 -Production`.
- `SENTRY_ENVIRONMENT`: Sentry environment, usually `staging` or `production`.
- `SENTRY_RELEASE`: optional release identifier, for example a commit SHA.
- `SENTRY_TRACES_SAMPLE_RATE`: performance trace sample rate. Start low, for example `0.05`.
- `SENTRY_SEND_DEFAULT_PII`: keep `0` unless a documented privacy review approves user PII in events.
- `WAF_PROVIDER`: edge protection owner/provider, for example `vercel`.
- `WAF_STATUS`: must be `configured` only after WAF/rate-limit rules are active.

## Frontend public vars

- `NEXT_PUBLIC_API_URL`: API root, including `/api`, for example `https://shineapp-api.vercel.app/api`.
- `NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN`: optional local/demo flag. Use `1` only when the login may prefill a demo username. Leave unset in real production.
- `NEXT_PUBLIC_SHINEAPP_DEMO_USERNAME`: optional demo username to prefill when `NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN=1`. Never put a password in public frontend env vars.

Every `NEXT_PUBLIC_` variable is bundled into browser JavaScript. Never put server secrets there.

## Local defaults

Local dev can use Docker Postgres through `POSTGRES_*` or SQLite fallback when no DB env is set. Keep `SUPABASE_STORAGE_ENABLED=0` locally unless you are explicitly testing remote media.

For real production, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\verify-env.ps1 -Production
```

That mode intentionally rejects localhost values, demo aliases, placeholder secrets, disabled remote storage, missing Sentry, and unconfigured WAF status.
