# Runbook De Operabilidad

Guia rapida para operar, monitorear y debuggear ShineApp en produccion/demo sin
tocar la base de datos ni leer el codigo. Complementa
`docs/deployment/manual-steps.md` (cutover) y `docs/deployment/env-vars.md`.

## Correlacionar un error reportado por un usuario

1. Cada respuesta lleva el header `X-Request-ID`. En errores tipo `detail` y en
   los 500, el `request_id` tambien viene en el body junto al `error_code`.
2. Buscar ese `request_id` en los runtime logs de Vercel (API) o en Sentry: los
   logs son JSON con `request_id`, `business_id` y `user_id`.
3. Si Sentry esta activo (`SENTRY_DSN` seteado), la excepcion no manejada aparece
   ahi taggeada con `request_id`.

## Salud del sistema

- Liveness rapido (uptime monitors): `GET /api/health/` -> `database` ok. Barato.
- Chequeo profundo (incluye storage Supabase): `GET /api/health/?deep=1` ->
  agrega `storage: ok|error` escribiendo/leyendo/borrando un objeto canario.
  Usarlo en smoke tests, no como ping continuo.

## Mantenimiento (cron) — que corre y como forzarlo

El workflow `.github/workflows/maintenance.yml` (schedule cada 15 min) hace
`POST /api/internal/maintenance/` con el header `X-Cron-Token: $CRON_SECRET`.
Corre jobs idempotentes:

- `notifications`: reintenta la outbox de emails (pendientes/fallidos). Tras
  `max_attempts` la fila pasa a `dead` (visible en admin).
- `fixed_expenses`: materializa ocurrencias de gastos fijos vencidas (antes solo
  pasaba al abrir la vista; ahora la caja del dia no depende de eso).
- `password_reset_tokens`: borra tokens usados/vencidos.
- `push_subscriptions`: reporta suscripciones activas (las muertas se limpian
  inline al fallar 404/410).
- `trash`: purga soft-deletes > `TRASH_RETENTION_DAYS` solo si
  `MAINTENANCE_PURGE_ENABLED=1`; si no, solo reporta.

Forzar a mano (sin esperar al cron):

```bash
curl -X POST -H "X-Cron-Token: <CRON_SECRET>" https://shineapp-api.vercel.app/api/internal/maintenance/
```

O via management commands desde una shell confiable (`config.settings_production`):

```powershell
cd backend
py -3 manage.py run_maintenance            # todos los jobs (papelera en dry-run)
py -3 manage.py run_maintenance --purge    # ademas purga papelera de verdad
py -3 manage.py flush_outbox               # reintentar notificaciones
py -3 manage.py materialize_fixed_expenses # generar ocurrencias vencidas
py -3 manage.py prune_password_reset_tokens
py -3 manage.py purge_trash --older-than 90            # DRY-RUN (no borra)
py -3 manage.py purge_trash --older-than 90 --apply    # borra de verdad
```

## Operaciones recurrentes sin DB/SSH

- Reintentar/inspeccionar un email que no salio: Django admin ->
  `Notifications > Notification outbox`. Filtrar por `status=failed|dead`, ver
  `last_error`, accion "Reintentar envio".
- Ver el audit trail de una operacion critica (caja, pago, orden): admin ->
  `Core > Audit logs` (read-only, buscable por actor/modulo/entidad).
- Reabrir/cerrar caja, aprobar/cancelar reservas, archivar solicitudes: acciones
  del admin de cada modelo.

## Arranque seguro

- `wsgi.py`/`asgi.py` corren `enforce_runtime_safety()`: si `APP_ENVIRONMENT` no
  es local/test y `DEBUG=True` o el `SECRET_KEY` es de dev, el proceso falla al
  arrancar con un mensaje claro (evita prod corriendo con settings de dev).
- Antes de un deploy productivo: `scripts/deploy/verify-env.ps1 -Production`.

## Activacion post-merge (una sola vez)

1. Generar `CRON_SECRET` (aleatorio largo) y cargarlo en: Vercel API (env var) y
   GitHub repo secret `CRON_SECRET`.
2. Opcional: variable de repo `SHINEAPP_API_BASE` si la API no es
   `https://shineapp-api.vercel.app`.
3. Confirmar `SENTRY_DSN` en Vercel API para capturar excepciones.
4. (Cuando haya SMTP real) setear `EMAIL_BACKEND`/`EMAIL_HOST*`; la outbox usa el
   backend configurado.
