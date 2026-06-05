# Fix: caja del dia se cerraba al ver un dia futuro (2026-06-05)

**Problema:** La caja del dia actual aparecia cerrada automaticamente "al
iniciar el dia" sin que el usuario la hubiera cerrado.

**Causa raiz:** `sync_past_cash_closures(reference_day=day)` cierra todos los
dias con movimientos `< reference_day`. Cuando el usuario navega a un dia
futuro (flecha "dia siguiente" del stepper de caja, input de fecha o salto a
una fecha futura desde la agenda), `reference_day` queda como ese dia futuro y
la fecha actual cae dentro del rango `< reference_day`, asi que se autocierra.
Al volver al dia actual (mismo dia o al iniciar el siguiente), la caja aparece
cerrada sin intervencion.

Es el caso simetrico al fix del [2026-06-03](2026-06-03-fix-reabrir-caja.md):
ese cambio evito que ver un dia pasado lo autocerrara a si mismo; este resuelve
que ver un dia futuro autocierre el dia real.

**Fix:** acotar el cutoff a `min(reference_day, date.today())` en
`sync_past_cash_closures`. Asi la autoclausura nunca cubre el dia real ni un
dia futuro.

**Archivos tocados:**
- `backend/finance/views.py`: `sync_past_cash_closures` usa
  `cutoff = min(reference_day, date.today())`.

**Test agregado:** `test_cash_daily_for_future_day_keeps_today_open` en
`backend/tests/test_mvp_flows.py` — verifica que GET `/cash/daily/?date=manana`
no crea `CashClosure` para hoy y que un GET posterior con `date=hoy` retorna
`is_closed: false`.

**Compatibilidad:**
- `test_cash_daily_auto_closes_previous_days` sigue pasando: ver hoy autocierra
  ayer.
- `test_cash_daily_after_reopen_returns_open_state` sigue pasando: ver un dia
  pasado reabierto no lo autocierra.
- No cambia contratos publicos (mismo payload de `/cash/daily/`).
