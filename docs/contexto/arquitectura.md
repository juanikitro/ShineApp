# Arquitectura

## Resumen real del sistema

- `backend/`: Django 5 + Django REST Framework.
- `frontend/`: Next.js App Router con React 19 y TypeScript.
- `docker-compose.yml`: orquesta `db`, `backend` y `frontend`.
- Base de datos principal: Postgres cuando hay variables `POSTGRES_*`.
- Fallback local: SQLite en `backend/db.sqlite3` cuando no hay Postgres configurado.

## Backend

Aplicaciones registradas en `backend/config/settings.py`:
- `core`
- `customers`
- `catalog`
- `scheduling`
- `workorders`
- `finance`
- `inventory`
- `quotes`
- `dashboard`
- `notifications`

Patrones visibles hoy:
- la API se registra desde `backend/config/urls.py`,
- los endpoints usan `ModelViewSet`, `APIView` y serializers por app,
- parte de la logica de negocio vive en serializers, model methods y acciones de views,
- existen helpers puntuales fuera de views, por ejemplo `notifications/service.py`.

Regla practica:
- no fuerces una capa `services/` donde hoy el modulo no la usa,
- si hace falta extraer logica, hacelo solo cuando reduzca duplicacion o aclare un boundary real.

## Frontend

Superficie actual:
- `frontend/app/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/app/globals.css` como entrypoint
- `frontend/app/styles/*.css` para estilos particionados por surface
- `frontend/lib/page-support.tsx` para helpers y soporte compartido del home
- `frontend/lib/`

Regla practica:
- preservar el contrato del backend como fuente de verdad,
- resolver cambios visuales primero sobre la superficie existente,
- evitar redisenar rutas o estructura del frontend si el pedido es puntual.

## Integracion backend/frontend

- `NEXT_PUBLIC_API_URL` define la URL base del frontend hacia la API.
- El backend publica recursos bajo `/api/`.
- La autenticacion por defecto del backend usa token o session.

Antes de cambiar payloads o estados:
- revisar serializer y endpoint,
- revisar el consumidor en `frontend/app/page.tsx` o `frontend/lib/`,
- actualizar ambas capas y la validacion.
