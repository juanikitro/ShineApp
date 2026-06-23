# Performance Capa 1: indices compuestos (business, ...)

## Contexto

Auditoria de performance (2026-06-12), escala objetivo produccion miles+ filas.
El patron multi-tenant + soft-delete implica que toda query de lectura filtra
`business=` (y `deleted_at IS NULL`) y suele ordenar por fecha/estado. Varias
tablas calientes no tenian indices que lideren con `business`, asi que a escala
hacian full scans crecientes. La mas critica es `AuditLog` (tabla de mayor
crecimiento): `AuditLogView` filtra `business=` y ordena `-created_at`, pero los
indices existentes lideraban con `created_at`/`actor`/`module`/`action`, no con
`business`.

## Cambio

Se agregaron `Meta.indexes` compuestos liderados por `business`:

- `core.AuditLog`: `(business,-created_at)`, `(business,module,-created_at)`,
  `(business,action,-created_at)`, `(business,entity_type,entity_id)`.
- `debts.Debt`: `(business,-origin_date)`, `(business,due_date)`.
- `debts.DebtPayment`: `(business,-paid_at)`.
- `inventory.StockMovement`: `(business,-occurred_on)`,
  `(business,movement_type,occurred_on)`.
- `inventory.MaterialPurchase`: `(business,-purchased_at)`.
- `fixed_expenses.FixedExpense`: `(business,is_active)`.
- `fixed_expenses.FixedExpenseOccurrence`: `(business,status,period_date)`.
- `tasks.Task`: `(business,status)`, `(business,assignee)`.
- `quotes.Quote`: `(business,-quote_date)`, `(business,status)`.
- `catalog.Service`: `(business,is_active)`.
- `catalog.Sector`: `(business,is_active)`.

`SoftDeleteMixin.Meta` solo define `abstract`/`base_manager_name` (el indice de
`deleted_at` esta en el campo, no en `Meta.indexes`), asi que agregar `indexes`
en los hijos no pisa nada heredado.

### Migraciones no bloqueantes

7 migraciones nuevas. Usan `AddIndexConcurrentlyIfPostgres`
(`backend/core/migration_operations.py`) con `atomic = False`: en PostgreSQL
crean los indices con `CREATE INDEX CONCURRENTLY` (sin lock de escritura, critico
en prod con tablas grandes); en SQLite (tests/dev) caen a `CREATE INDEX` normal.
El procedimiento de aplicacion en prod, el caveat del transaction pooler de
Supabase y la recuperacion de indices INVALID quedan en
`docs/deployment/manual-steps.md` seccion 14.1.

## Impacto esperado

- `AuditLogView`, listados de cash/stock/debts/quotes/tasks y los rollups del
  dashboard filtrados por `business` + fecha/estado pasan de seq scan a index
  scan a escala.
- Sin lock de escritura al crear los indices en el deploy automatizado.

## Archivos modificados

- `backend/core/models.py`, `backend/debts/models.py`,
  `backend/inventory/models.py`, `backend/fixed_expenses/models.py`,
  `backend/tasks/models.py`, `backend/quotes/models.py`,
  `backend/catalog/models.py` (Meta.indexes)
- `backend/core/migration_operations.py` (nueva operacion)
- 7 migraciones nuevas (core, catalog, debts, fixed_expenses, inventory, quotes, tasks)
- `docs/deployment/manual-steps.md` (seccion 14.1)

## Validacion

- `py -3 manage.py makemigrations --check --dry-run`: `No changes detected`.
- `py -3 -m pytest tests/test_migrations.py tests/test_audit_log.py tests/test_tasks.py
  tests/test_debts.py tests/test_fixed_expenses.py tests/test_sectors.py
  tests/test_stock_movements.py`: 79 passed (las migraciones aplican en SQLite via el
  fallback no-CONCURRENTLY).
