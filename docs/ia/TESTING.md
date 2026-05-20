# TESTING.md

Guia de testing para cambios hechos por IA en ShineApp.

Fuente de verdad general: `../../AGENTS.md`.

## Herramientas detectadas

- Backend: `pytest`, `pytest-django`, `pytest-cov`.
- Frontend: Vitest sobre `frontend/lib/*.test.mjs` y `frontend/app/components/**/*.test.{ts,tsx}`.
- Build visible: `next build`.
- Runtime integrado: `docker compose`.

Configuracion:
- `backend/pytest.ini` define `DJANGO_SETTINGS_MODULE=config.settings`.
- `backend/.coveragerc` mide apps propias y exige `fail_under = 90`.
- `frontend/vitest.config.mjs` mide `frontend/lib/**` y componentes reutilizables en `frontend/app/components/**`; el gate exige 90 en statements, branches, functions y lines.
- `frontend/package.json` expone `test`, `test:coverage`, `build` y `validate`.
- `scripts/validate.ps1` corre la validacion raiz.
- `scripts/test-coverage.ps1` corre coverage backend + frontend.

## Contrato obligatorio para IA

- No modificar, borrar, relajar o saltar tests para "hacer pasar" una implementacion.
- Si un test falla, diagnosticar causa raiz antes de tocar codigo. No cambiar la expectativa salvo que el test contradiga un contrato vigente documentado o el codigo fuente real.
- Para bugs y cambios de comportamiento, usar TDD practico: escribir o ajustar primero un test que falle por el bug o por el contrato nuevo; luego implementar el minimo cambio y volver a correr.
- Todo cambio no trivial debe incluir tests por riesgo, no solo por lineas cubiertas.
- Si algo no es testeable en su forma actual, extraer la logica a `frontend/lib/**`, a un componente reusable o a una unidad backend testeable. Documentar deuda solo cuando extraer sea mas riesgoso que el cambio.
- La entrega debe incluir comandos ejecutados y resultado. Si la validacion fue parcial, decirlo como parcial.

## Restriccion de recursos frontend

En ShineApp no abuses de Node, Vitest ni Next. Hubo incidentes reales donde `node.exe` consumio decenas de GiB de commit y dejo Windows sin memoria.

Reglas obligatorias antes de cualquier comando frontend pesado:

- No ejecutes en paralelo `npm run test`, `npm run test:coverage`, `npm run build`, `npx vitest`, `next dev` ni `next start`.
- No uses `multi_tool_use.parallel` ni otra ejecucion paralela para comandos que lancen Node, npm, Vitest, Playwright, Next o Vite.
- Antes de iniciar tests, coverage, build o dev server, revisa procesos Node scoped a este frontend:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object { $_.CommandLine -like '*ShineApp*frontend*' } | Select-Object ProcessId,CommandLine
```

- Si ya hay Node/Next/Vitest corriendo para `ShineApp/frontend`, no lances otro. Reutiliza el servidor existente o detene solo esos procesos scoped y reportalo.
- Para Vitest, preferi ejecuciones chicas y secuenciales. Usa tests puntuales primero.
- Evita `npm run test:coverage` salvo que sea estrictamente necesario.
- Si necesitas coverage completo, correlo una sola vez, sin otros Node activos y con workers limitados. Si el script del proyecto no limita workers, usa:

```powershell
cd frontend
npx vitest run --maxWorkers=1 --coverage
```

- No corras `npm run build` mientras haya Vitest, coverage o dev server activos.
- Si aparece `El archivo de paginacion es demasiado pequeno`, `JavaScript heap out of memory`, procesos Node con varios GiB, o PowerShell falla por memoria: para, mata solo los Node scoped a `ShineApp/frontend`, y reporta causa e impacto.
- Validacion minima preferida: test puntual, luego build o coverage solo si el cambio lo justifica, y resumen claro de lo que corrio y lo que no.

## Matriz minima de riesgo

- API/serializer/permisos: happy path, payload invalido, auth/permisos, compatibilidad con consumidor frontend.
- Modelos/migraciones: integridad, defaults, constraints, compatibilidad con datos existentes.
- Side effects de negocio: stock, caja, pagos, deudas, estados de ordenes, auditoria y notificaciones.
- Frontend helpers: parsing, filtros, orden, estados vacios, errores y edge cases.
- Componentes reutilizables: accesibilidad, teclado/foco, disabled/loading/empty, interacciones criticas y callbacks.
- UI monolitica en `frontend/app/page.tsx`: cubrir por build/smoke mientras se extrae logica a helpers/componentes testeables.
- Fixes de bug: test de regresion que falle sin el fix.

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

Para cambios no triviales, sumar coverage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test-coverage.ps1
```

Este comando falla si backend o frontend baja del 90%.

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
npm run test:coverage
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
- Cambio amplio o generado por IA: `scripts/validate.ps1` y `scripts/test-coverage.ps1`.

## Tests visibles

- Backend: `backend/tests/`.
- Frontend helpers: `frontend/lib/*.test.mjs`.
- Frontend componentes: `frontend/app/components/**/*.test.{ts,tsx}`.

Reutiliza patrones existentes antes de crear suites paralelas. Si no agregas test para un bugfix o feature, explica por que.

## Politica de coverage

- Backend: coverage sobre apps propias, excluyendo migraciones, tests y bootstrap/configuracion. Umbral duro: 90.
- Frontend: coverage inicial sobre `frontend/lib/**` y componentes reutilizables. Umbral duro: 90 en statements, branches, functions y lines.
- `frontend/app/page.tsx` queda fuera del gate inicial por su tamano monolitico. Cualquier logica nueva que hoy viviria ahi debe extraerse a `frontend/lib/**` o a un componente cubierto.
- No bajar umbrales ni agregar exclusiones para maquillar resultados. Las exclusiones deben representar codigo no productivo, generado, bootstrap o deuda explicita aprobada.
- El reporte de coverage no reemplaza tests de contrato: una linea cubierta sin asercion util no cuenta como validacion suficiente.
