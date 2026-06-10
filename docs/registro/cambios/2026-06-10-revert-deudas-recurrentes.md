# Revert de deudas recurrentes (2026-06-10)

Se revierte la feature de deudas recurrentes (`2026-06-05-deudas-recurrentes.md`)
y se reemplaza por el modulo dedicado Gastos fijos
(`2026-06-10-gastos-fijos.md`).

**Motivo:** las deudas recurrentes mezclaban costos operativos fijos (servicios,
alquiler, expensas) dentro del modulo de obligaciones puntuales `Deudas`. Se
separan en un modulo propio con egresos reales y pago automatico opcional.

## Que se elimino

Backend (`backend/debts/`):
- Modelo `RecurringDebt` y el FK `Debt.recurring_source`.
- `debts/recurrence.py` (materializacion lazy de deudas).
- `RecurringDebtSerializer`, `RecurringDebtViewSet`, `RecurringDebtAdmin`.
- Rutas `/api/recurring-debts/...` en `config/urls.py`.
- Migraciones `0005_recurring_debt` y `0007_alter_recurringdebt_*`; la `0006`
  se reancla a `0004_debt_business` (sus operaciones son base: `deleted_at` +
  `AlterModelOptions` de Debt/DebtPayment).
- `tests/test_recurring_debts.py`.

Frontend:
- Campos recurrentes en `blankDebtForm`, seccion "Repetir automaticamente" en
  `DebtForm`, bloque "Plantillas recurrentes" + banner de skips + badge
  "Recurrente" en `DebtPanel`, handlers y rama recurrente de `saveDebt` en
  `page.tsx`, dataset `recurringDebts` (data-loading/app-data),
  `recurring-debt-form.test.mjs` y el CSS `.debt-recurr*`/`.debt-skipped*`/
  `.status.recurring`.

## Datos

El revert del esquema elimina las plantillas `RecurringDebt`. Las deudas ya
generadas se conservan como deudas normales (al desaparecer `recurring_source`
las filas `Debt` quedan intactas). En entornos con DB ya migrada (Postgres con
datos) correr `py -3 manage.py migrate debts 0004` antes de borrar las
migraciones, o quedaran tabla/columna huerfanas.

## Validacion

- `py -3 manage.py makemigrations --check --dry-run` (No changes detected)
- `py -3 manage.py check`
- `py -3 -m pytest` (suite completa verde)
- `npm run test` + `npm run build`
