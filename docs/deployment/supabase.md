# Supabase Setup

## Postgres

1. Create a Supabase project for the demo.
2. In Project Settings or Connect, copy a Postgres connection string.
3. For Vercel serverless, prefer the pooler URL. Use transaction pooler for short request/response workloads unless you need session features.
4. Store it in the API project as `DATABASE_URL`.
5. Set `DATABASE_SSL_REQUIRE=1`.

Current demo project:

- Name: `shineapp-demo`
- Project ref: `cdzqcpwbsfyeeigecqwr`
- Region: `sa-east-1`
- API URL: `https://cdzqcpwbsfyeeigecqwr.supabase.co`
- DB host: `db.cdzqcpwbsfyeeigecqwr.supabase.co`

The MCP does not expose the database password or complete pooler URL. For the public demo, `DATABASE_URL` was copied manually from the Supabase Dashboard Connect screen and stored only in the Vercel API project.

Validate locally with production settings import before deploying:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_production"
.\.venv\Scripts\python.exe manage.py check --deploy
```

## Storage

1. Create a bucket, for example `shineapp-media`.
2. Decide access mode:
   - Public bucket for a low-friction demo.
   - Private bucket with signed URLs if uploaded files are sensitive.
3. Enable S3 access for Storage.
4. Create an access key and secret for server-side use only.
5. Configure:
   - `SUPABASE_STORAGE_ENABLED=1`
   - `SUPABASE_STORAGE_BUCKET=shineapp-media`
   - `SUPABASE_S3_ENDPOINT_URL=https://<project-ref>.storage.supabase.co/storage/v1/s3`
   - `SUPABASE_S3_REGION_NAME=<region>`
   - `SUPABASE_S3_ACCESS_KEY_ID=<key-id>`
   - `SUPABASE_S3_SECRET_ACCESS_KEY=<secret>`

Do not expose S3 access keys in Next.js.

Current demo storage:

- Bucket: `shineapp-media`
- Access: private
- Recommended backend setting: `SUPABASE_STORAGE_QUERYSTRING_AUTH=1`
- Endpoint: `https://cdzqcpwbsfyeeigecqwr.storage.supabase.co/storage/v1/s3`
- Public URL base: leave unset while the bucket is private.
- Validation on 2026-05-18: Django `migrate --check` against the transaction pooler returned clean.
- Validation on 2026-05-18: S3 `head_bucket` returned OK for `shineapp-media`.
- Validation on 2026-05-18: public API healthcheck returned `database=ok`.

S3 access keys are not exposed by the MCP. Create them manually in Supabase Dashboard, then store them only in Vercel backend env vars.

Migration command once `DATABASE_URL` is available:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_production"
$env:DJANGO_SECRET_KEY="<real-secret>"
$env:DJANGO_ALLOWED_HOSTS=".vercel.app,shineapp-api.vercel.app"
$env:CORS_ALLOWED_ORIGINS="https://<frontend-preview>"
$env:CSRF_TRUSTED_ORIGINS="https://<frontend-preview>"
$env:DATABASE_URL="<supabase-pooler-url>"
$env:DATABASE_SSL_REQUIRE="1"
$env:SUPABASE_STORAGE_ENABLED="1"
$env:SUPABASE_STORAGE_BUCKET="shineapp-media"
$env:SUPABASE_S3_ENDPOINT_URL="https://cdzqcpwbsfyeeigecqwr.storage.supabase.co/storage/v1/s3"
$env:SUPABASE_S3_REGION_NAME="sa-east-1"
$env:SUPABASE_S3_ACCESS_KEY_ID="<server-side-key-id>"
$env:SUPABASE_S3_SECRET_ACCESS_KEY="<server-side-secret>"
$env:SUPABASE_STORAGE_QUERYSTRING_AUTH="1"
$env:SUPABASE_STORAGE_LOCATION="media"
.\.venv\Scripts\python.exe manage.py migrate
```

Do not run `seed_demo` until the target database is confirmed.

Seed status: demo seed was applied to Supabase on 2026-05-18 with explicit confirmation flags for a demo target. The run did not create a Django admin superadmin.
