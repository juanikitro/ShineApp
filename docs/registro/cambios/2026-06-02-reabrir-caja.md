# Reabrir caja

## Cambio funcional

- El empleador puede reabrir la caja de un dia cerrado desde el panel de caja.
- Al reabrir se elimina el `CashClosure` del dia, volviendo el estado a "Abierta".
- El boton "Reabrir caja" aparece solo cuando la caja esta cerrada, junto a "Registrar ajuste hoy".
- La accion esta restringida al empleador (`CanViewEconomy`); empleados no tienen acceso.
- Se registra un evento de auditoria (`action=reopen`) con snapshot previo al borrado.

## Contrato API

- `POST /api/cash/reopen/` acepta `{ "date": "YYYY-MM-DD" }`.
- Respuesta exitosa: `{ "date": "YYYY-MM-DD" }` con status 200.
- Si el dia no esta cerrado: 400 con `{"date": "La caja de este dia no esta cerrada."}`.
- Permiso: `CanViewEconomy` (solo empleadores).

## Compatibilidad

- No modifica modelos ni migraciones; solo elimina el registro `CashClosure`.
- Los movimientos del dia (CashMovement, Payment, DebtPayment) no se alteran.
- Si el dia ya tenia cierre automatico (`sync_past_cash_closures`), al reabrir queda disponible para cerrarse manualmente de nuevo.
