# Puertos locales dedicados

## Cambio

El entorno local de ShineApp usa puertos dedicados para evitar choques con otros proyectos:

- Frontend: `9000`.
- Backend: `9001`.
- Postgres publicado al host: `9002`.

## Alcance

- `docker-compose.yml` publica esos puertos por defecto y permite sobrescribirlos con `SHINEAPP_FRONTEND_PORT`, `SHINEAPP_BACKEND_PORT` y `SHINEAPP_DB_PORT`.
- `NEXT_PUBLIC_API_URL`, CORS y CSRF apuntan al backend y frontend en los nuevos puertos locales.
- Los comandos locales del README usan `9000` y `9001`.

## Validacion esperada

- `docker compose config --quiet`.
- `npm run test -- lib/api.test.mjs`.
