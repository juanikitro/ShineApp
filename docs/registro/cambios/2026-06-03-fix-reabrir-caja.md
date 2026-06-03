# Fix: reabrir caja no persistía el estado abierto (2026-06-03)

**Problema:** Al reabrir una caja de un día pasado, el toast de éxito aparecía
pero la caja seguía mostrándose cerrada.

**Causa raíz:** `CashDailyView.get` llama `sync_past_cash_closures` sin
`reference_day`, por lo que usa `date.today()`. Eso auto-cierra todos los días
pasados con movimientos, incluyendo el día que se acaba de reabrir. El ciclo era:

1. POST `/cash/reopen/` → elimina `CashClosure` del día
2. `loadData` llama GET `/cash/daily/?date=<dia_pasado>`
3. `sync_past_cash_closures(reference_day=today)` recrea el closure
4. La vista retorna `is_closed: true` otra vez

**Fix:** pasar `reference_day=day` (el día solicitado) a
`sync_past_cash_closures` en `CashDailyView.get`. Así solo se auto-cierran días
estrictamente anteriores al día solicitado, no el día en sí.

**Archivos tocados:**
- `backend/finance/views.py` (línea 182): agrega `reference_day=day`

**Test agregado:** `test_cash_daily_after_reopen_returns_open_state` en
`backend/tests/test_mvp_flows.py` — verifica que GET `/cash/daily/` retorna
`is_closed: false` inmediatamente después de reabrir un día pasado.

**Compatibilidad:** no rompe el auto-cierre de días pasados al ver el día actual
(`test_cash_daily_auto_closes_previous_days` sigue pasando).
