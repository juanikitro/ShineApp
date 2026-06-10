# Deudas recurrentes con materializacion lazy (2026-06-05)

> **REVERTIDO el 2026-06-10.** Reemplazado por el modulo Gastos fijos
> (`2026-06-10-gastos-fijos.md`); detalle del revert en
> `2026-06-10-revert-deudas-recurrentes.md`.

**Objetivo:** automatizar la creacion de deudas mensuales recurrentes (alquiler,
servicios, abonos). Cada plantilla define monto, periodicidad y vencimiento;
cuando se consulta la lista de deudas el backend materializa los ciclos
pendientes hasta hoy.

## Modelo

Nuevo `debts.RecurringDebt` con:

- `concept`, `creditor`, `supplier`, `principal_amount`,
  `expense_category/subcategory`, `notes`: heredados a cada deuda generada.
- `interval_unit` (`days`/`weeks`/`months`) + `interval_count` (>=1):
  periodicidad libre.
- `start_date`: primera generacion.
- `due_offset_days`: vencimiento = origen + offset (0 = sin fecha de vencimiento).
- `end_date` opcional + `max_cycles` opcional + `is_active` (pausa): tres
  formas de detener la recurrencia, todas opcionales y combinables.
- `auto_settle` + `auto_settle_method`: si esta activo, al generar la deuda
  tambien crea un `DebtPayment` por el principal total con la fecha de origen.
- `last_generated_for` y `cycles_generated`: sentinela de idempotencia.

`Debt` gana un FK opcional `recurring_source` con `on_delete=SET_NULL`. Borrar
la plantilla no toca las deudas ya generadas.

Migracion: `backend/debts/migrations/0005_recurring_debt.py`.

## Materializacion lazy

`debts.recurrence.materialize_due(business, today)` itera plantillas activas y
para cada una genera los ciclos faltantes hasta `today`. Usa
`select_for_update` por plantilla para evitar duplicados en requests
concurrentes.

Si un ciclo cae en un dia con caja cerrada
(`finance.cash.is_cash_day_closed`), se omite la generacion, se avanza el
puntero `last_generated_for` para no quedar bloqueado y se registra un
`SkippedPeriod`. El endpoint `GET /api/debts/` expone los skipped del request
actual en `skipped_recurring_periods` (formato compatible: si no hay skipped
devuelve el array clasico; si hay, devuelve un objeto
`{results, skipped_recurring_periods}`).

## Endpoints

- `GET/POST /api/recurring-debts/` y `GET/PATCH/PUT/DELETE /api/recurring-debts/{id}/`
- `POST /api/recurring-debts/{id}/pause/` y `.../resume/`: cambian `is_active`.
- `POST /api/recurring-debts/{id}/apply-to-current/`: si existe la deuda del
  ciclo en curso y no tiene pagos, sobrescribe sus datos con la plantilla
  (incluye sync del `CashMovement` espejo).
- `GET /api/recurring-debts/{id}/current-cycle/`: deuda del ciclo actual.

## Frontend

- `frontend/lib/page-support.tsx`: `blankDebtForm` ahora incluye campos
  recurrentes (`is_recurring`, `interval_*`, `due_offset_days`, `end_date`,
  `max_cycles`, `auto_settle`, `auto_settle_method`).
- `DebtForm` agrega una seccion colapsable "Repetir automaticamente"; al
  enviar con el toggle activo, el POST sale a `/recurring-debts/` en vez de
  `/debts/`.
- `DebtPanel` muestra:
  - Banner con `skipped_recurring_periods` (descartable).
  - Bloque "Plantillas recurrentes" con acciones Aplicar al ciclo, Pausar,
    Reanudar, Eliminar y la fecha del proximo ciclo.
  - Badge `Recurrente` en las deudas que vienen de una plantilla.
- `data-loading.ts` agrega `recurringDebts` al juego de datasets de la
  seccion `debts` y `cash`.
- `app-data.ts` migra `/debts/` de `apiList` a `apiFetch` para tolerar el
  shape extendido del response.

## Decisiones

- Backfill: solo desde `start_date` (o desde la creacion) hacia adelante. No
  se generan ciclos previos a esa fecha aunque el `start_date` quede en el
  pasado.
- Concurrencia: `select_for_update` por plantilla + `last_generated_for`.
- Caja cerrada: salta y avisa; nunca crea deuda con `origin_date` en dia
  cerrado.
- Edicion de plantilla: por defecto los cambios solo afectan futuras
  generaciones. Para propagar a la deuda del ciclo en curso (cuando no tiene
  pagos) hay un boton explicito "Aplicar al ciclo" sobre la plantilla.

## Tests

- Backend: `backend/tests/test_recurring_debts.py` (13 casos) cubre
  generacion mensual/semanal/diaria, idempotencia, end_date/max_cycles,
  caja cerrada, auto_settle, pausa, edicion via plantilla y validaciones.
- Frontend: `frontend/lib/recurring-debt-form.test.mjs` verifica el shape
  del nuevo `blankDebtForm` y los options del select de periodicidad.
  `frontend/lib/app-data.test.mjs` actualizado para reflejar el endpoint
  via `apiFetch` y el nuevo dataset `recurringDebts`.

## Riesgos y limitaciones

- La materializacion solo ocurre al consumir `/debts/`. Si nadie abre el
  panel de deudas, las plantillas no generan deudas hasta que alguien lo
  haga. Es deliberado para no depender de cron.
- El banner de skips se ve solo en el request donde se saltearon; al
  refrescar deja de aparecer. Las plantillas quedan listas para generar el
  siguiente ciclo en su fecha normal.
