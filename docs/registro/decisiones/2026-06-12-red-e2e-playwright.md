# Red de seguridad E2E con Playwright antes del refactor del god component

## Contexto

El refactor profundo va a mover ~14.000 lineas de UI que hoy **no tienen
ningun test directo**: `frontend/app/page.tsx` concentra estado, efectos,
carga de datos y orquestacion, y no existe un test que ejercite esos flujos
de punta a punta. El gate de coverage 90% mide las funciones puras de `lib/`
y algunos paneles, pero no la orquestacion del god component. Refactorizar sin
una red de comportamiento es la principal fuente de riesgo de la iniciativa.

## Decision

- Adoptar **Playwright** como suite E2E.
- **Caracterizar el comportamiento actual antes de tocar codigo**: escribir
  E2E de los flujos criticos contra la app tal como esta hoy, para que sirvan
  de oraculo de "no rompi" durante la decomposicion.
- Flujos minimos a cubrir primero: login/auth, reserva -> work order -> pago,
  movimiento de stock (compra/consumo/venta), caja (apertura/cierre/movimiento),
  presupuesto -> PDF, deudas y gastos fijos.
- Correr en CI contra la app buildeada + backend con fallback SQLite, sembrando
  datos con el comando `seed_demo`.

## Alternativas consideradas

- **Testing Library por seccion**: util y sin browser, pero no cubre el render
  real end-to-end ni la integracion entre secciones. Se usara igual como red
  fina por container, **ademas** de Playwright, no en su lugar.
- **Cypress**: equivalente funcional, mas pesado y con peor paralelismo.
- **Sin red formal** (solo unit tests de `lib/` + QA manual): lo mas rapido de
  arrancar, pero asume riesgo alto de regresiones silenciosas en flujos no
  cubiertos. Descartado por el tamano del refactor.

## Consecuencias

- +1 dependencia de desarrollo (`@playwright/test`) y tiempo adicional de CI.
- Los E2E se escriben **antes** de la decomposicion y se mantienen verdes en
  cada PR del Track F.
- Se necesita un entorno reproducible (build + SQLite + seed) para correrlos.

## Validacion esperada

- Un smoke E2E (login) corre verde en CI como base.
- Cada PR de decomposicion deja verde el E2E del flujo que toca; si un flujo
  cambia de comportamiento a proposito, se actualiza el E2E en el mismo PR y se
  justifica.
