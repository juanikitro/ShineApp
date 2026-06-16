# Endurecimiento de operabilidad (observabilidad, async/cron, consistencia)

## Contexto

Auditoria de operabilidad sobre el demo: la app es funcionalmente solida (buen
admin, transacciones de dinero/stock, audit trail), pero estaba ciega en el eje
observabilidad + trabajo asincrono. Sin cola ni cron (Vercel serverless sin
workers), los emails/push corrian inline y los avisos al cliente fallaban en
silencio; sin `request_id` ni logs estructurados, un error reportado no se podia
correlacionar; y produccion podia arrancar con settings de dev sin que nada lo
detecte. Alcance elegido: endurecer el demo (sin separar staging/prod todavia).

## Cambio en backend

### Observabilidad
- `request_id` por request (`core/middleware.py` + `core/request_context.py`):
  se lee/genera, viaja en el header `X-Request-ID`, se inyecta en cada log y en
  el scope de Sentry. El contexto se resetea por request (sin fuga business/user).
- Logs estructurados JSON (`core/logging.py`) con `request_id`/`business_id`/
  `user_id`. `LOG_FORMAT=json` en prod, texto plano legible en local.
- Exception handler DRF (`core/exceptions.py`): toda respuesta de error lleva
  `X-Request-ID`; los errores tipo `detail` y los 500 incluyen `error_code` y
  `request_id`. Los 500 ya no filtran internals. Los errores por-campo conservan
  su forma (no se rompe el mapeo del frontend).
- Health check (`/api/health/`): DB rapido por default; `?deep=1` verifica el
  storage Supabase (canary write/read/delete). Se elimino el WARNING por request.
- `TrashPurgeView` ya no filtra `str(exc)` al cliente; loguea server-side.

### Trabajo diferido y recurrencia (sin workers)
- `NotificationOutbox` (modelo nuevo): los emails se persisten y se mandan
  best-effort inline con timeout; si fallan, el cron los reintenta hasta
  `max_attempts` y luego pasan a `dead`. Fin del `fail_silently` mudo. Visible y
  reintentable desde el admin.
- Web push con timeout y limpieza de suscripciones muertas (404/410).
- Endpoint interno `POST /api/internal/maintenance/` (auth por `X-Cron-Token` ==
  `CRON_SECRET`, comparacion en tiempo constante) que corre jobs idempotentes:
  flush outbox, materializar gastos fijos, purgar tokens vencidos, reportar push,
  purga de papelera (solo con `MAINTENANCE_PURGE_ENABLED=1`).
- Workflow `.github/workflows/maintenance.yml` (schedule cada 15 min) lo dispara.
- Management commands: `run_maintenance`, `flush_outbox`,
  `materialize_fixed_expenses`, `prune_password_reset_tokens`,
  `prune_push_subscriptions`, `purge_trash` (dry-run por default).

### Arranque seguro y config
- `enforce_runtime_safety()` en `wsgi.py`/`asgi.py`: si el entorno no es
  local/test y `DEBUG=True` o el secret es de dev, el proceso falla al arrancar
  (mata el fallback silencioso a `config.settings` en prod).
- Timeouts explicitos: DB (`connect_timeout`), email (`EMAIL_TIMEOUT`), push
  (`PUSH_TIMEOUT_SECONDS`).
- `FRONTEND_BASE_URL` reemplaza el dominio hardcodeado en links de email.

### Consistencia y constraints
- `DebtPaymentViewSet.perform_create`: `transaction.atomic` + `select_for_update`
  sobre la deuda, revalidando el saldo bajo lock (evita sobrepago concurrente).
- `WorkOrder.status()`: transicion envuelta en `transaction.atomic`; el email al
  cliente se difiere con `transaction.on_commit` (nunca "listo" sin intentar el
  aviso).
- `CashReopenView`: `select_for_update` sobre el cierre.
- `CheckConstraint` en DB para montos/stock no negativos: `Payment.amount>0`,
  `DebtPayment.amount>0`, `Debt.principal_amount>0`, `CashMovement.amount>=0`,
  `Material.stock_quantity/minimum_stock/estimated_unit_cost>=0`,
  `MaterialPurchase.quantity>0`/`total_cost>=0`,
  `MaterialConsumption.quantity>=0`.

### Mensajes
- "Estado invalido" y "Tipo de movimiento invalido" ahora enumeran las opciones
  validas.

## Cambio en frontend

- El cliente de API expone el `request_id` (header `X-Request-ID`) en los errores
  para que el operador pueda pasarlo a soporte.

## Migraciones

- `notifications`: `NotificationOutbox`.
- `finance`, `debts`, `inventory`: `CheckConstraint` (forward-compatible; los
  datos del seed ya cumplen). Para tablas grandes en prod real, usar
  `AddConstraint` con `NOT VALID` + `VALIDATE` por separado.

## Validacion

- `py -3 -m pytest` (incluye `tests/test_operability.py` nuevo): verde.
- `py -3 manage.py check`: sin issues.
- `scripts/deploy/verify-env.ps1 -Example`: shape OK.

## Activacion post-merge (manual)

- Cargar `CRON_SECRET` en Vercel API y como secret de GitHub.
- Confirmar `SENTRY_DSN` en Vercel API.
- Ver `docs/deployment/operability-runbook.md`.
