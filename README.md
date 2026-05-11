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
