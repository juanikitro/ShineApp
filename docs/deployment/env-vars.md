# Environment Variables

Do not commit real values. Use `.env.example` as shape only.

## Backend private vars

- `DJANGO_SETTINGS_MODULE`: `config.settings` locally, `config.settings_production` on Vercel API.
- `DJANGO_SECRET_KEY`: secret server-side key. Production must be a real random value.
- `DJANGO_DEBUG`: `1` locally, ignored as false in production settings.
- `DJANGO_ALLOWED_HOSTS`: comma-separated API hostnames.
- `CORS_ALLOWED_ORIGINS`: comma-separated web origins allowed by the API.
- `CORS_ALLOWED_ORIGIN_REGEXES`: optional comma-separated regex origins for Vercel preview domains.
- `CSRF_TRUSTED_ORIGINS`: comma-separated trusted web origins for Django CSRF.
- `DATABASE_URL`: Supabase Postgres connection string.
- `DATABASE_SSL_REQUIRE`: `1` for Supabase production connections.
- `SUPABASE_STORAGE_ENABLED`: `1` in demo/prod when media must persist.
- `SUPABASE_STORAGE_BUCKET`: Storage bucket for uploads.
- `SUPABASE_S3_ENDPOINT_URL`: `https://<project-ref>.storage.supabase.co/storage/v1/s3`.
- `SUPABASE_S3_REGION_NAME`: Supabase project region.
- `SUPABASE_S3_ACCESS_KEY_ID`: server-side S3 access key id.
- `SUPABASE_S3_SECRET_ACCESS_KEY`: server-side S3 secret key.
- `SUPABASE_STORAGE_QUERYSTRING_AUTH`: `0` for public bucket URLs, `1` for signed S3 URLs.
- `SUPABASE_STORAGE_PUBLIC_URL`: public object URL base when unsigned media URLs are used.
- `SUPABASE_STORAGE_LOCATION`: optional prefix inside the bucket, default `media`.

## Frontend public vars

- `NEXT_PUBLIC_API_URL`: API root, including `/api`, for example `https://shineapp-api.vercel.app/api`.

Every `NEXT_PUBLIC_` variable is bundled into browser JavaScript. Never put server secrets there.

## Local defaults

Local dev can use Docker Postgres through `POSTGRES_*` or SQLite fallback when no DB env is set. Keep `SUPABASE_STORAGE_ENABLED=0` locally unless you are explicitly testing remote media.
