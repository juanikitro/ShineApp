# Camino De Actualizacion

## Demo

- Dos proyectos Vercel desde un monorepo.
- URLs publicas:
  - Web: `https://shineapp-web.vercel.app`
  - API: `https://shineapp-api.vercel.app`
- Proyecto Supabase `shineapp-demo` en `sa-east-1`.
- Supabase Postgres y bucket privado de Storage `shineapp-media`.
- Migraciones demo automatizadas mediante el environment GitHub Actions `demo-production`.
- Sin workers en background.
- Sin media en filesystem.
- Smoke tests basicos despues del deploy publico.
- Seed demo aplicado con credenciales demo default. Rotar antes de produccion.

## Produccion Paga

Antes de trafico real de clientes:

- Pasar a Supabase Pro o un plan equivalente de backup/retencion.
- Agregar dominios custom para web y API.
- Configurar proveedor de email productivo y dominio remitente verificado.
- Configurar Sentry mediante `SENTRY_DSN` y mantener `SENTRY_SEND_DEFAULT_PII=0` salvo que una revision de privacidad apruebe lo contrario.
- Configurar rate limiting y reglas WAF en endpoints publicos; setear `WAF_STATUS=configured` solo despues de que las reglas del dashboard esten activas.
- Reemplazar auth con token legible por navegador por cookies HttpOnly/SameSite o auth de sesion Django con CSRF, expiracion de token/sesion, rotacion y revocacion server-side.
- Mantener Django en Vercel solo para trafico productivo inicial orientado a request/response y baja concurrencia.
- Agregar checklist de release para migraciones, rollback, seed/datos demo y smoke tests.
- Separar proyectos staging y production antes de datos reales de clientes.
- Agregar rotacion de secrets para env vars de Vercel y claves Supabase S3.
- Agregar revision explicita de acceso de buckets antes de cambiar cualquier bucket a publico.
- Reemplazar passwords demo default y decidir si se necesita un superuser real de Django admin.
- Eliminar proyectos Vercel no usados o accidentales para evitar drift operativo.

Mover Django fuera de serverless hacia un contenedor persistente antes de aceptar cargas con generacion larga de PDF, colas, persistencia tipo websocket, uploads pesados, workers programados, alta concurrencia de conexiones DB o procesamiento en background. Si alguno de esos requisitos aparece para el primer cliente real, el movimiento a contenedor es bloqueante de lanzamiento y no una optimizacion posterior.
