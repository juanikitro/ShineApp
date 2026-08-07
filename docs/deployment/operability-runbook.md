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

## Atribuir requests lentas antes de reducir CPU de Functions

La funcion Python de Vercel agrupa Django bajo `/django`; sus metricas de Active
CPU no identifican por si solas la ruta que las genero. Hasta contar los eventos
de abajo, **no hay una ruta dominante observada**: no asumir que dashboard,
healthcheck o prefetch del frontend sea la causa.

El backend emite un log JSON `slow_request` solo cuando una request tarda al
menos 300 ms. La linea contiene unicamente `request_id`, `method`, `path` (sin
query string), `status` y `duration_ms`; no contiene body, query params, IP,
token, email ni payload. `duration_ms` mide duracion de request, no CPU puro:
sirve para atribuir frecuencia y latencia por ruta, y se contrasta despues con
Active CPU de Vercel.

Para obtener evidencia tras el proximo deploy:

1. Abrir `shineapp-api` en Vercel, ir a **Logs**, elegir **Production** y el
   mismo intervalo que se analizara en Usage/Functions.
2. Filtrar texto por `slow_request`. Para revisar una candidata, sumar el texto
   exacto de su `path` (por ejemplo, `/api/dashboard/summary/`). Cada resultado
   muestra los campos JSON de ruta, status y duracion.
   Los conteos genericos de Runtime Logs no equivalen a invocaciones: solo
   cuentan lineas que la aplicacion ya emitio. Usar unicamente los eventos
   `slow_request` de la version que incorpora esta instrumentacion.
3. Para cada `path`, registrar cantidad de eventos, `duration_ms` mediana/P75 y
   maxima; comparar tambien su concentracion horaria con el pico de invocaciones.
   Una ruta solo es candidata a optimizacion si domina por frecuencia, duracion
   o ambas de forma repetida.
4. Comparar una ventana equivalente antes/despues: invocaciones, Active CPU
   total, CPU Throttle y Cold Start en Vercel, mas el conteo/duracion de
   `slow_request` por ruta. No inferir una mejora de CPU solo porque baje la
   latencia de una request.

Segun la ruta dominante medida, investigar una sola hipotesis: queries y
serializacion si es dashboard; solicitudes duplicadas si son rutas autenticadas
del frontend; origen/frecuencia del monitor si es health; o consistencia e
invalidacion si es disponibilidad publica. No agregar cache compartido a datos
autenticados o multi-tenant sin clave por negocio/rol e invalidacion explicita.

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
