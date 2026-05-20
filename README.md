# ShineApp

MVP web para negocios de car detailing, lavado y estetica vehicular. Incluye clientes, vehiculos, servicios, reservas, ordenes de trabajo, pagos, caja diaria, materiales, compras, consumos, cotizaciones PDF, dashboard y emails por backend.

## Stack

- Backend: Django + Django REST Framework
- Frontend: Next.js
- Base de datos: PostgreSQL en Docker; SQLite como fallback local del backend
- PDF: ReportLab
- Email: backend SMTP configurable; consola en desarrollo

## Levantar con Docker

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Por defecto, `docker compose` tambien carga `docker-compose.override.yml`: el servicio `frontend` corre con `next dev`, monta el codigo local de `frontend/` y recarga al editar archivos. Para cambios de dependencias del frontend:

```powershell
docker compose up --build -d frontend
```

Para probar la imagen productiva del frontend, usa solo el compose base:

```powershell
docker compose -f docker-compose.yml up --build frontend
```

URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin Django: http://localhost:8000/admin

Usuario demo:

- Usuario: `admin`
- Clave: `admin123`

## Desarrollo local sin Docker

Backend:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py runserver
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Documentacion viva

La documentacion fuente vive en `docs/` y se sirve como sitio navegable con MkDocs Material. `docs/indice.md` sigue siendo el mapa canonico: el sitio no reemplaza ni duplica las fuentes de verdad del repo.

Instalar dependencias docs:

```powershell
py -3 -m pip install -r requirements-docs.txt
```

Servir localmente:

```powershell
py -3 -m mkdocs serve
```

Regenerar indices chicos y deterministas:

```powershell
py -3 scripts/check_docs.py --write --skip-build
```

Validar drift y build estricto:

```powershell
py -3 scripts/check_docs.py --check
py -3 -m mkdocs build --strict
```

Reglas de mantenimiento:

- Todo cambio funcional visible va a `docs/registro/cambios/`.
- Toda decision de arquitectura, contrato o negocio va a `docs/registro/decisiones/`.
- El build docs debe fallar si hay links rotos, nav invalida o archivos canonicos faltantes.
- GitHub Pages, Vercel o Read the Docs quedan como opciones futuras; no hay deploy automatico de docs.

## Preparacion de demo deploy

La estructura de deploy mantiene el monorepo actual:

- `frontend/`: proyecto Vercel `shineapp-web`.
- `backend/`: proyecto Vercel `shineapp-api`.
- Supabase Postgres: `DATABASE_URL`.
- Supabase Storage S3: media persistente.

No se hacen migraciones ni seed automaticamente en startup. Para preparar el entorno lee `docs/deployment/` y completa los pasos manuales antes de desplegar.

Checks de deploy prep:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\verify-env.ps1 -Example
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\check-backend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\check-frontend.ps1
```

Despues de un preview deploy aprobado:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\smoke-test.ps1 -WebBaseUrl https://<web-domain> -ApiBaseUrl https://<api-domain>/api
```

## Validacion

Comando recomendado desde la raiz:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

El script ejecuta:
- `docker compose config --quiet`
- backend tests con `backend/.venv`, `py -3` o `python`, en ese orden
- `manage.py check`
- `npm run test`
- `npm run build`

Checks puntuales:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe manage.py check
```

```powershell
cd frontend
npm run test
npm run build
npm run validate
```

Docs:

```powershell
py -3 scripts/check_docs.py --check
py -3 -m mkdocs build --strict
```
