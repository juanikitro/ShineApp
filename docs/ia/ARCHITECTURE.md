# ARCHITECTURE.md

Guia operativa de arquitectura y boundaries para cambios hechos por IA en ShineApp.

Fuentes complementarias:
- `../../docs/contexto/arquitectura.md`
- `../../docs/contexto/aplicaciones.md`
- `../../README.md`

## Resumen real del sistema

- Backend Django modular por apps en `backend/`.
- API REST con DRF registrada desde `backend/config/urls.py`.
- Frontend Next.js App Router en `frontend/`.
- Persistencia principal en Postgres via Docker Compose.
- Fallback local del backend a SQLite cuando faltan variables `POSTGRES_*`.
- Emails desde backend con provider configurable por variables de entorno.

## Capas y boundaries

### 1. Presentacion

Incluye:
- `frontend/app/*`
- `backend/*/views.py`
- serializers cercanos al contrato API
- `backend/config/urls.py`

Responsabilidad:
- parsear request,
- validar input cercano al boundary,
- delegar,
- responder o renderizar.

### 2. Dominio y aplicacion

Ubicacion visible hoy:
- models por app,
- serializers con reglas del flujo,
- acciones de viewsets,
- helpers puntuales como `notifications/service.py`.

Regla:
- no mover logica por dogma,
- extraer solo cuando la misma regla se repite o el archivo pierde claridad.

### 3. Persistencia

- ORM Django.
- Evitar SQL manual concatenado.
- Cuidar consistencia de stock, pagos, capacidad y estados de ordenes.

### 4. Infraestructura

- `docker-compose.yml`
- settings de Django
- SMTP
- CORS
- integracion frontend/backend por `NEXT_PUBLIC_API_URL`

## Side effects a tratar explicitamente

- actualizacion de stock,
- movimientos de caja,
- cambios de estado de ordenes,
- emails o notificaciones.

Si un cambio toca side effects:
- hacerlo visible en codigo,
- cubrir el caso con test si es viable,
- evitar efectos silenciosos.

## Regla para cambios full-stack

Si cambia comportamiento observable:
1. revisar model/serializer/view,
2. revisar el consumidor frontend,
3. validar backend y frontend,
4. documentar el contrato si cambia.
