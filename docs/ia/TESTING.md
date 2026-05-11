# TESTING.md

Guia de testing para cambios hechos por IA en ShineApp.

Fuente de verdad general: `../../AGENTS.md`.

## Herramientas detectadas

- Backend: `pytest`, `pytest-django`.
- Frontend: Node test runner sobre `frontend/lib/*.test.mjs`.
- Build visible: `next build`.
- Runtime integrado: `docker compose`.

Configuracion:
- `backend/pytest.ini` define `DJANGO_SETTINGS_MODULE=config.settings`.
- `frontend/package.json` expone `test`, `build` y `validate`.
- `scripts/validate.ps1` corre la validacion raiz.

## Comando recomendado

Desde la raiz:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

El script selecciona Python en este orden:
1. `backend/.venv/Scripts/python.exe`
2. `py -3`
3. `python`

Luego ejecuta:
- `docker compose config --quiet`
- `python -m pytest`
- `python manage.py check`
- `npm run test`
- `npm run build`

## Checks puntuales

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe manage.py check
```

Si no hay `.venv`, usar:

```powershell
cd backend
py -3 -m pytest
py -3 manage.py check
```

Frontend:

```powershell
cd frontend
npm run test
npm run build
npm run validate
```

Compose:

```powershell
docker compose config --quiet
```

## Que validar segun el cambio

- Bugfix backend: caso que rompia, resultado esperado y side effects relacionados.
- API o serializer: payload valido, payload invalido, permisos si aplica y consumidor frontend.
- Modelo o migracion: tests del flujo, integridad de datos y compatibilidad.
- Frontend local: `npm run test` para helpers afectados y `npm run build`.
- UI visual: build, flujo tocado, responsive/foco si el cambio afecta interaccion.
- Full-stack: backend contract test, frontend build y prueba manual del flujo.

## Tests visibles

- Backend: `backend/tests/`.
- Frontend: `frontend/lib/*.test.mjs`.

Reutiliza patrones existentes antes de crear suites paralelas. Si no agregas test para un bugfix o feature, explica por que.
