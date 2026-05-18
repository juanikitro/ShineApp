# Arquitectura

## Resumen real del sistema

- `backend/`: Django 5 + Django REST Framework.
- `frontend/`: Next.js App Router + React 19 + TypeScript.
- `docker-compose.yml`: orquesta `db`, `backend`, `frontend`.
- DB principal: Postgres si hay `POSTGRES_*`.
- Fallback local: SQLite en `backend/db.sqlite3` si no hay Postgres.

## Backend

Apps registradas en `backend/config/settings.py`:
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

Patrones actuales:
- API desde `backend/config/urls.py`,
- endpoints con `ModelViewSet`, `APIView`, serializers por app,
- logica de negocio en serializers, model methods, acciones de views,
- helpers puntuales fuera de views, ej. `notifications/service.py`.

Regla practica:
- no fuerces capa `services/` donde hoy el modulo no la usa,
- extrae logica solo si reduce duplicacion o aclara boundary real.

## Frontend

Superficie actual:
- `frontend/app/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/app/globals.css` como entrypoint
- `frontend/app/styles/*.css` para estilos por surface
- `frontend/lib/page-support.tsx` para helpers y soporte compartido del home
- `frontend/lib/`

Regla practica:
- preservar contrato backend como fuente de verdad,
- cambios visuales primero sobre superficie existente,
- evitar redisenar rutas o estructura frontend si pedido puntual.

## Integracion backend/frontend

- `NEXT_PUBLIC_API_URL` define URL base frontend -> API.
- Backend publica recursos bajo `/api/`.
- Autenticacion backend default: token o session.

Antes de cambiar payloads o estados:
- revisar serializer y endpoint,
- revisar consumidor en `frontend/app/page.tsx` o `frontend/lib/`,
- actualizar ambas capas y validacion.
