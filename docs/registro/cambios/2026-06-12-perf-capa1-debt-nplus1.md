# Performance Capa 1: N+1 de Debt (annotate)

## Contexto

Auditoria de performance (2026-06-12). `DebtSerializer` exponia `total_paid`,
`balance_due` y `status` como properties que hacian `payments.aggregate(Sum)` por
deuda (y `status` recalculaba `balance_due` -> `total_paid`), y el campo anidado
`payments` usaba `DebtPaymentSerializer.get_debt_balance_due` que hacia
`obj.debt.balance_due` (FK + aggregate) por pago. Una pagina de 100 deudas con
~3 pagos c/u disparaba 1000+ queries.

## Cambio

- `debts/models.py`: `Debt.total_paid` ahora lee la anotacion `total_paid_amount`
  si esta presente (en memoria, sin query); fuera de ese contexto cae al aggregate.
  `balance_due` y `status` se benefician al construir sobre `total_paid`.
- `debts/views.py`:
  - `DebtViewSet` anota `total_paid_amount = Coalesce(Sum("payments__amount",
    filter=payments vivos), 0)`. El `filter=` replica la semantica soft-delete del
    related manager (excluye pagos borrados), igualando la property.
  - `DebtPaymentViewSet` anota `debt_total_paid` via Subquery correlada para que el
    saldo del listado standalone no haga un aggregate por pago.
- `debts/serializers.py`:
  - `DebtSerializer.to_representation` linkea la deuda padre (anotada) en cada pago
    prefetcheado, asi `get_debt_balance_due` no dispara FK + aggregate por pago.
  - `get_debt_balance_due` usa `debt_total_paid` (standalone) o la deuda padre
    linkeada (nested); el principal sale de `obj.debt` que es select_related.

Sin cambios de contrato: el JSON expuesto (total_paid, balance_due, status,
payments[].debt_balance_due) es identico.

## Impacto esperado

- Listado de deudas: de O(deudas x pagos) queries a constante (1 query de deudas +
  1 prefetch de pagos + scoping/paginacion). TTFB del endpoint de deudas y de los
  data-loads de cash/debts.

## Archivos modificados

- `backend/debts/models.py`, `backend/debts/views.py`, `backend/debts/serializers.py`
- `backend/tests/test_debts.py` (test de regresion: query count independiente del nro de pagos)

## Validacion

- `py -3 -m pytest tests/test_debts.py tests/test_dashboard_series.py tests/test_trash.py`:
  todo verde. El nuevo `test_debt_list_query_count_is_independent_of_payments` prueba
  que sumar pagos no aumenta las queries del listado.
