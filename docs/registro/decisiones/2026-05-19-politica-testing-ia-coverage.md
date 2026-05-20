# 2026-05-19 - Politica de testing IA y coverage 90

## Estado

Aceptada.

## Contexto

ShineApp va a recibir cambios frecuentes asistidos por IA. El riesgo principal no es solo falta de tests, sino tests modificados para pasar, regresiones silenciosas en contratos backend/frontend y cobertura medida sobre codigo poco relevante.

## Decision

- Todo cambio de comportamiento hecho por IA debe seguir TDD practico: test que falle, implementacion minima y validacion.
- Queda prohibido modificar, borrar, relajar o saltear tests para hacer pasar una implementacion.
- Se agrega coverage con gate duro de 90.
- Backend usa `pytest-cov` con `.coveragerc` sobre apps propias. Se excluyen migraciones, tests y bootstrap/configuracion.
- Frontend usa Vitest + V8 coverage sobre `frontend/lib/**` y componentes reutilizables en `frontend/app/components/**`.
- Frontend exige 90 en statements, branches, functions y lines.
- `frontend/app/page.tsx` queda fuera del gate inicial por su tamano monolitico. Nueva logica testeable debe extraerse a `frontend/lib/**` o componentes cubiertos.
- `scripts/validate.ps1` sigue siendo validacion general rapida.
- `scripts/test-coverage.ps1` pasa a ser obligatorio para cambios no triviales.

## Consecuencias

- Las implementaciones generadas por IA deben reportar comandos y resultados, no solo afirmar que "pasa".
- Aumenta el costo inicial de cambios grandes, pero baja el riesgo de romper caja, reservas, deudas, permisos, componentes reutilizables o helpers compartidos.
- Si un area no puede cubrirse sin refactor riesgoso, la deuda debe quedar explicita. No se baja el umbral para ocultarla.

## Validacion inicial

- Backend coverage: 149 tests, 90.38%.
- Frontend coverage: 118 tests, 95.44% statements, 90.22% branches, 97.06% functions, 97.40% lines.
