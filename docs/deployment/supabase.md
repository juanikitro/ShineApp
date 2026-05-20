# Configuracion De Supabase

## Postgres

1. Crear un proyecto Supabase para la demo.
2. En Project Settings o Connect, copiar una connection string de Postgres.
3. Para Vercel serverless, preferir la URL del pooler. Usar transaction pooler para cargas cortas request/response salvo que necesites funcionalidades de sesion.
4. Guardarla en el proyecto API como `DATABASE_URL`.
5. Setear `DATABASE_SSL_REQUIRE=1`.

Proyecto demo actual:

- Nombre: `shineapp-demo`
- Project ref: `cdzqcpwbsfyeeigecqwr`
- Region: `sa-east-1`
- API URL: `https://cdzqcpwbsfyeeigecqwr.supabase.co`
- DB host: `db.cdzqcpwbsfyeeigecqwr.supabase.co`

El MCP no expone el password de base de datos ni la URL pooler completa. Para la demo publica, `DATABASE_URL` se copio manualmente desde la pantalla Connect del Supabase Dashboard y se guardo en el proyecto Vercel API mas el entorno GitHub `demo-production` para migraciones automatizadas.

Validar localmente con import de configuracion de produccion antes de desplegar:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_production"
.\.venv\Scripts\python.exe manage.py check --deploy
```

## Storage

1. Crear un bucket, por ejemplo `shineapp-media`.
2. Decidir modo de acceso:
   - Bucket publico para una demo de baja friccion.
   - Bucket privado con URLs firmadas si los archivos subidos son sensibles.
3. Habilitar acceso S3 para Storage.
4. Crear access key y secret para uso server-side solamente.
5. Configurar:
   - `SUPABASE_STORAGE_ENABLED=1`
   - `SUPABASE_STORAGE_BUCKET=shineapp-media`
   - `SUPABASE_S3_ENDPOINT_URL=https://<project-ref>.storage.supabase.co/storage/v1/s3`
   - `SUPABASE_S3_REGION_NAME=<region>`
   - `SUPABASE_S3_ACCESS_KEY_ID=<key-id>`
   - `SUPABASE_S3_SECRET_ACCESS_KEY=<secret>`

No exponer access keys S3 en Next.js.

Storage demo actual:

- Bucket: `shineapp-media`
- Acceso: privado
- Setting backend recomendado: `SUPABASE_STORAGE_QUERYSTRING_AUTH=1`
- Endpoint: `https://cdzqcpwbsfyeeigecqwr.storage.supabase.co/storage/v1/s3`
- Base URL publica: dejar sin setear mientras el bucket sea privado.
- Validacion el 2026-05-18: Django `migrate --check` contra el transaction pooler termino limpio.
- Validacion el 2026-05-18: S3 `head_bucket` retorno OK para `shineapp-media`.
- Validacion el 2026-05-18: healthcheck publico de API retorno `database=ok`.

Las access keys S3 no son expuestas por el MCP. Crearlas manualmente en Supabase Dashboard y guardarlas solo en env vars del backend en Vercel.

Comando de migracion una vez disponible `DATABASE_URL`:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_migrations"
$env:DJANGO_MIGRATION_SECRET_KEY="<dedicated-migration-secret>"
$env:DATABASE_URL="<supabase-pooler-url>"
$env:DATABASE_SSL_REQUIRE="1"
.\.venv\Scripts\python.exe manage.py migrate
```

No ejecutar `seed_demo` hasta confirmar la base de datos destino.

Estado de seed: el seed demo se aplico a Supabase el 2026-05-18 con flags de confirmacion explicitos para un destino demo. La corrida no creo un superadmin de Django admin.
