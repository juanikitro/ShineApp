# Variables De Entorno

No commitear valores reales. Usar `.env.example` solo como forma.

## Variables Privadas Backend

- `APP_ENVIRONMENT`: etiqueta de runtime. Usar `local` localmente, `staging` para staging y `production` solo para produccion real.
- `DJANGO_SETTINGS_MODULE`: `config.settings` localmente, `config.settings_production` en Vercel API.
- `DJANGO_SECRET_KEY`: clave secreta server-side. Produccion debe usar un valor aleatorio real.
- `DJANGO_DEBUG`: `1` localmente; en configuracion de produccion se ignora como false.
- `DJANGO_ALLOWED_HOSTS`: hostnames de API separados por coma.
- `CORS_ALLOWED_ORIGINS`: origenes web permitidos por la API, separados por coma.
- `CORS_ALLOWED_ORIGIN_REGEXES`: regex opcionales separadas por coma para dominios preview de Vercel.
- `CSRF_TRUSTED_ORIGINS`: origenes web confiables para Django CSRF, separados por coma.
- `DATABASE_URL`: connection string de Supabase Postgres.
- `DATABASE_SSL_REQUIRE`: `1` para conexiones productivas Supabase.
- `DJANGO_THROTTLE_ANON_RATE`: tasa de throttle anonimo DRF en configuracion de produccion, default `60/min`.
- `DJANGO_THROTTLE_USER_RATE`: tasa de throttle autenticado DRF en configuracion de produccion, default `600/min`.
- `SUPABASE_STORAGE_ENABLED`: `1` en demo/prod cuando media debe persistir.
- `SUPABASE_STORAGE_BUCKET`: bucket Storage para uploads.
- `SUPABASE_S3_ENDPOINT_URL`: `https://<project-ref>.storage.supabase.co/storage/v1/s3`.
- `SUPABASE_S3_REGION_NAME`: region del proyecto Supabase.
- `SUPABASE_S3_ACCESS_KEY_ID`: id de access key S3 server-side.
- `SUPABASE_S3_SECRET_ACCESS_KEY`: secret key S3 server-side.
- `SUPABASE_STORAGE_QUERYSTRING_AUTH`: `0` para URLs de bucket publico, `1` para URLs S3 firmadas.
- `SUPABASE_STORAGE_PUBLIC_URL`: base publica de object URL cuando se usan URLs de media sin firma.
- `SUPABASE_STORAGE_LOCATION`: prefijo opcional dentro del bucket, default `media`.
- `SENTRY_DSN`: DSN backend de Sentry. Dejar vacio localmente; requerido por `verify-env.ps1 -Production`.
- `SENTRY_ENVIRONMENT`: entorno de Sentry, usualmente `staging` o `production`.
- `SENTRY_RELEASE`: identificador opcional de release, por ejemplo un commit SHA.
- `SENTRY_TRACES_SAMPLE_RATE`: sample rate de trazas de performance. Empezar bajo, por ejemplo `0.05`.
- `SENTRY_SEND_DEFAULT_PII`: mantener `0` salvo que una revision de privacidad documentada apruebe PII de usuarios en eventos.
- `WAF_PROVIDER`: dueno/proveedor de proteccion edge, por ejemplo `vercel`.
- `WAF_STATUS`: debe ser `configured` solo despues de que las reglas WAF/rate-limit esten activas.
- `VAPID_PRIVATE_KEY`: clave privada VAPID server-side para firmar push notifications Web Push. Secreto. Si esta vacia, el backend no envia ninguna push y devuelve False silenciosamente. Generar con `npx web-push generate-vapid-keys`.
- `VAPID_PUBLIC_KEY`: clave publica VAPID. Debe coincidir exactamente con `NEXT_PUBLIC_VAPID_PUBLIC_KEY` o las suscripciones del navegador fallan.
- `VAPID_CLAIMS_EMAIL`: contacto `mailto:` que recibe los push providers en caso de problemas. Por ejemplo `mailto:soporte@shineapp.com.ar`. Default `mailto:no-reply@shineapp.local`.

### Observabilidad y operabilidad

- `LOG_FORMAT`: `json` en produccion (logs estructurados con `request_id`/`business_id`, capturados por Vercel) o `plain` (texto legible) en local. `settings_production` fuerza `json` igual.
- `DJANGO_LOG_LEVEL`: nivel del logger root. Default `WARNING` en base, `INFO` en produccion.
- `DATABASE_CONNECT_TIMEOUT`: timeout de conexion a Postgres en segundos. Default `10`.
- `EMAIL_TIMEOUT`: timeout del envio SMTP en segundos (evita requests colgados). Default `10`.
- `PUSH_TIMEOUT_SECONDS`: timeout del envio de web push en segundos. Default `10`.
- `WHATSAPP_TIMEOUT_SECONDS`: timeout del request a WhatsApp provider en segundos. Default `10`.
- `WHATSAPP_META_API_VERSION`: version Graph API usada por Meta Cloud API. Default `v20.0`.
- `WHATSAPP_META_ACCESS_TOKEN`: token server-side global para Meta Cloud API. Preferir config por negocio cuando cada cliente usa su propio numero.
- `WHATSAPP_META_PHONE_NUMBER_ID`: Phone number ID global para Meta Cloud API. Preferir config por negocio cuando cada cliente usa su propio numero.
- `FRONTEND_BASE_URL`: base publica del frontend usada en los links de emails (reset, bienvenida, avisos). Reemplaza el dominio hardcodeado. Default `https://shineapp-web.vercel.app`.
- `CRON_SECRET`: secret compartido para autenticar el endpoint interno `POST /api/internal/maintenance/`, que dispara el workflow `maintenance.yml` (header `X-Cron-Token`). Vacio = endpoint deshabilitado (responde 503). En produccion, generar un valor aleatorio largo y cargarlo tanto en Vercel API como en los secrets de GitHub. Comparacion en tiempo constante.
- `TRASH_RETENTION_DAYS`: dias que un registro soft-deleted debe tener antes de ser elegible para purga. Default `90`.
- `MAINTENANCE_PURGE_ENABLED`: `1` para que el mantenimiento purgue la papelera de verdad; `0` (default) hace que solo reporte cuanto seria elegible (dry-run seguro).

## Variables Publicas Frontend

- `NEXT_PUBLIC_API_URL`: raiz de API, incluyendo `/api`, por ejemplo `https://shineapp-api.vercel.app/api`.
- `NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN`: flag opcional local/demo. Usar `1` solo cuando el login pueda prellenar un usuario demo. Dejar sin setear en produccion real.
- `NEXT_PUBLIC_SHINEAPP_DEMO_USERNAME`: usuario demo opcional para prellenar cuando `NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN=1`. Nunca poner un password en env vars publicas de frontend.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: clave publica VAPID expuesta al navegador. Debe coincidir exactamente con `VAPID_PUBLIC_KEY` del backend. Si esta vacia, ni el dashboard del negocio ni la turnera publica registran suscripciones push.
- `NEXT_PUBLIC_SHINEAPP_TOKEN_TTL_DAYS`: dias que el token de sesion sobrevive en `localStorage` antes de forzar re-login. Default `30` cuando no se setea o el valor no es un entero positivo. En el demo subirlo (ej. `30`) reduce friccion; en produccion bajarlo si la politica lo exige.

Toda variable `NEXT_PUBLIC_` se bundlea en JavaScript del navegador. Nunca poner secretos de servidor ahi.

## Defaults Locales

Dev local puede usar Docker Postgres mediante `POSTGRES_*` o fallback SQLite cuando no hay env de DB. Mantener `SUPABASE_STORAGE_ENABLED=0` localmente salvo que estes probando media remota explicitamente.

Para produccion real, ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\verify-env.ps1 -Production
```

Ese modo rechaza intencionalmente valores localhost, aliases demo, secretos placeholder, storage remoto deshabilitado, Sentry faltante y WAF sin configurar.
