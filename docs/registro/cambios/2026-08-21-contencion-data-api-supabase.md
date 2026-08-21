# Contencion de la Data API de Supabase

Fecha: 2026-08-21

## Cambio

Se cerro la exposicion de las tablas internas de ShineApp por la Data API de
Supabase. Se revocaron los privilegios de `anon` y `authenticated` sobre
`public`, se desactivaron esos privilegios por defecto para nuevas tablas y se
habilito RLS en las 55 tablas existentes.

## Efecto operativo

La aplicacion continua usando Django y su conexion directa a Postgres. Las
claves publishable/anon ya no pueden consultar las tablas internas por
`/rest/v1/`. Como respuesta de incidente se invalidaron los tokens DRF y las
sesiones Django existentes; los usuarios deben volver a iniciar sesion.

El bucket `shineapp-media` permanece privado y el uso de Storage desde Django
continua con URLs firmadas.

## Validacion

- Data API con clave publishable contra una tabla interna: HTTP 401, sin datos.
- Security Advisor: cero alertas `rls_disabled_in_public`.
- `https://shineapp-api.vercel.app/api/health/`: aplicacion, base y Storage OK.
- `https://shineapp-web.vercel.app/`: HTTP 200.

## Pendiente externo

Rotar en Meta el token de WhatsApp potencialmente expuesto y actualizarlo en la
configuracion operativa correspondiente, sin publicar el valor.
