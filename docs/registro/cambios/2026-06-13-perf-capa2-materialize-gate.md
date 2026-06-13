# Performance Capa 2: Gate en materialize_due por list GET

## Contexto

Auditoría de performance (2026-06-12/13). `FixedExpenseViewSet.list` y
`FixedExpenseOccurrenceViewSet.list` llamaban `materialize_due()` en cada GET,
iterando todos los planes activos del negocio aunque ya hubieran sido
materializados en el mismo día. En negocios con decenas de planes, esto
generaba queries y locks innecesarios en cada apertura de la sección.

## Cambio

`backend/fixed_expenses/views.py` — `_materialize_for()`:

Antes de llamar `materialize_due()`, se hace un `.exists()` que detecta si
algún plan activo del negocio no tiene `last_generated_for` en hoy o antes
(planes nuevos o con occurrencias pendientes de generar). Si todos los planes
ya están al día (`last_generated_for >= today`), se saltea el loop completo.

```python
has_pending = FixedExpense.objects.filter(
    business=business, is_active=True,
).filter(
    Q(last_generated_for__isnull=True) | Q(last_generated_for__lt=today)
).exists()
if not has_pending:
    return
```

## No incluido (deliberado)

- **email en on_commit**: `send_task_assignment_email` se deja síncrono.
  `transaction.on_commit` rompía los tests con `TestCase` (los callbacks no se
  ejecutan en transacciones que no commitean). Sin workers (constraint: sin
  infra nueva), no hay forma de diferir el email sin cambiar los tests.

## Impacto esperado

- Típico caso de uso (apertura diaria de la sección): una sola query `.exists()`
  de O(1) en vez del loop por plan. Latencia del list endpoint reducida después
  de la primera apertura del día.

## Archivos modificados

- `backend/fixed_expenses/views.py`

## Validación

- `pytest tests/test_fixed_expenses.py tests/test_tasks.py`: 50 passed.
