# Security runbook (Fase 0 — acciones de operador)

Pasos que **ejecuta una persona** en los paneles de Vercel y Supabase. Claude no
toca esos paneles. Hacelos en este orden; cada uno indica qué hacer, dónde y cómo
validar. Pensado para **producción con datos reales**: ninguno borra datos.

> Contexto: el código ya quedó *fail-secure* (los entrypoints WSGI/ASGI
> defaultean a `config.settings_production` y el arranque se niega a correr en
> Vercel con la `SECRET_KEY` pública de dev). Por eso, **antes de mergear** hay
> que confirmar que las variables de producción estén completas, o el deploy
> fallará a propósito en vez de quedar inseguro.

## 1. Variables de entorno en Vercel (Production **y** Preview)

En el proyecto de backend → Settings → Environment Variables, confirmá/seteá:

| Variable | Valor | Por qué |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings_production` | Evita correr settings de dev. Setear en **Production y Preview**. |
| `DJANGO_SECRET_KEY` | (secreto nuevo ≥50 chars) | Ver paso 2 (rotación). |
| `DJANGO_DEBUG` | `0` | Sin tracebacks ni settings expuestos. |
| `DJANGO_ALLOWED_HOSTS` | hostnames reales de la API | Requerido por production settings. |
| `CORS_ALLOWED_ORIGINS` | orígenes web reales | Requerido. |
| `CSRF_TRUSTED_ORIGINS` | orígenes web reales | Requerido. |
| `DATABASE_URL` | connection string de Supabase | Requerido. |
| `DATABASE_SSL_REQUIRE` | `1` | TLS a la DB. |
| `SUPABASE_STORAGE_ENABLED` | `1` | Storage remoto. |
| `SUPABASE_STORAGE_QUERYSTRING_AUTH` | `1` | **URLs firmadas, bucket privado** (evita media pública). |
| `DJANGO_NUM_PROXIES` | `1` | IP real del cliente detrás de Vercel (rate-limit y auditoría). |
| `DJANGO_THROTTLE_LOGIN_RATE` | `10/min` (sugerido) | Anti fuerza bruta (lo consume Fase 2). |
| `DJANGO_THROTTLE_PASSWORD_RESET_RATE` | `5/min` (sugerido) | Anti email-bombing (Fase 2). |
| `DJANGO_LOGIN_LOCKOUT_THRESHOLD` | `8` (sugerido) | Lockout por cuenta (Fase 2). |

**Validar:** redeploy y abrir `GET https://<api>/api/health/` → `{"status":"ok"}`.
Si falta una variable requerida, el deploy falla con `ImproperlyConfigured`
nombrando la variable (eso es lo esperado: fail-secure).

## 2. Rotación de secretos (cierra la tarea #96)

1. **`DJANGO_SECRET_KEY`**: generar uno nuevo y reemplazarlo en Vercel.
   - Generar: `py -3 -c "from django.core.management.utils import get_random_secret_key as g; print(g())"`.
   - Impacto: **no** desloguea a usuarios con token (los tokens DRF son aleatorios
     en DB, no derivan de la `SECRET_KEY`). Sí invalida sesiones del Django admin.
     Los links de reset siguen válidos (son tokens en DB).
2. **Claves S3 de Supabase** (`SUPABASE_S3_ACCESS_KEY_ID` / `SUPABASE_S3_SECRET_ACCESS_KEY`):
   - Supabase → Project Settings → Storage → S3 access keys → revocar las viejas y crear nuevas.
   - Actualizar ambas en Vercel. Redeploy.
3. **Passwords demo**: si alguna vez se corrió `seed_demo` en un entorno
   accesible, cambiá esas contraseñas. (El código ahora rechaza sembrar
   credenciales demo contra cualquier DB no-local.)

**Validar:** subir un logo desde Configuración → debe guardarse y mostrarse
(prueba de que las nuevas claves S3 funcionan).

## 3. Endurecer Supabase

- **Storage**: el bucket `shineapp-media` debe ser **privado** (con
  `SUPABASE_STORAGE_QUERYSTRING_AUTH=1` las URLs van firmadas). Verificar que una
  URL de media vieja sin firma ya **no** sea accesible.
- **Database**: activar *Enforce SSL*; si el plan lo permite, restringir el
  ingress de la DB a las IP de egreso de Vercel.
- Revisar políticas RLS si se usan tablas fuera de Django.

## 4. (Opcional) Rate-limit de borde

No hay Vercel Pro/WAF en este proyecto, así que el rate-limit vive en Django
(Fase 2). Si en el futuro se habilita Vercel Firewall, agregar reglas para
`/api/auth/login/`, `/api/auth/password-reset/` y `/api/public/landing/*`.

## Checklist de validación final

- [ ] `GET /api/health/` responde `ok` en producción.
- [ ] `DJANGO_SETTINGS_MODULE=config.settings_production` en Production y Preview.
- [ ] `DJANGO_SECRET_KEY` y claves S3 **rotadas** (tarea #96 cerrada).
- [ ] Una URL de media sin firmar ya no abre (bucket privado).
- [ ] Login y carga de logo siguen funcionando tras la rotación.
