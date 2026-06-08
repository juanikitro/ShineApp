# Borrado de reserva cancelada con cobro asociado (2026-06-08)

## Contexto

Hasta hoy, borrar una reserva cancelada que ya tenia un cobro registrado fallaba
con error 500 silencioso. Causa raiz: `Reservation.delete()` dispara CASCADE
sobre `WorkOrder`, pero `Payment.work_order` esta con `on_delete=PROTECT`, asi
que Django levantaba `ProtectedError` y nada se borraba (ni la reserva, ni el
pago). El frontend recibia un 500 sin contexto.

## Cambio

`ReservationViewSet.destroy` (`backend/scheduling/views.py`) ahora resuelve la
cascada explicitamente, dentro de `transaction.atomic`, con las mismas reglas
que ya usan `PaymentViewSet` y `DebtViewSet`:

1. Mantiene el guard de estado: solo se puede borrar si `status == CANCELED`
   (cuando `reservation_use_canceled` esta activo en el perfil).
2. Rechaza con 400 si la reserva tiene movimientos o consumos de inventario
   asociados (via `work_order.material_consumptions`, `work_order.stock_movements`,
   o `reservation.stock_movements` directos). Mensaje:
   "La reserva tiene movimientos de inventario asociados. Revertilos antes de
   eliminarla." Justificacion: revertir stock es una operacion contable
   independiente que el usuario debe ejecutar conscientemente, no algo que
   queremos esconder en una cascada implicita.
3. Para cada `Payment` asociado al `WorkOrder`, valida que la caja del dia del
   pago este abierta (`ensure_cash_day_open`). Si alguna caja esta cerrada,
   devuelve 400 con `paid_at` en el detail y no toca nada. El usuario debe
   reabrir la caja primero, en linea con la convencion del resto del modulo
   financiero.
4. Si todas las cajas estan abiertas, borra los `CashMovement` ligados a esos
   pagos, despues los `Payment`, y finalmente delega a `super().destroy()`.
   La cascada DB se encarga del resto (`WorkOrder` y `ReservationItem`). La
   FK `Quote.reservation` ya estaba en `SET_NULL`, asi que la cotizacion
   asociada (si existia) queda como historico con `reservation=NULL`.

## Frontend

Sin cambios. `runAction` en `frontend/app/page.tsx` ya pasa los errores por
`formatApiError` (`frontend/lib/api-errors.ts`), que extrae el `detail` o el
field `paid_at` y los muestra en el toast. La regla "caja cerrada" no se
duplica en frontend para evitar divergencia con el backend.

## Archivos modificados

- `backend/scheduling/views.py` - override de `destroy` con cascada controlada.
- `backend/tests/test_mvp_flows.py` - tres tests nuevos junto a
  `test_delete_canceled_reservation_removes_it`.

## Tests

- `test_delete_canceled_reservation_with_payment_open_cash_succeeds`:
  reserva cancelada con un pago, caja abierta -> 204 y borrado en cascada
  de Payment y CashMovement.
- `test_delete_canceled_reservation_with_payment_closed_cash_returns_400`:
  igual pero con la caja del dia del pago cerrada -> 400 con `paid_at` en el
  detail; todo queda intacto.
- `test_delete_canceled_reservation_with_stock_consumption_returns_400`:
  reserva cancelada con consumo de material -> 400 explicito.

Validacion: `pytest tests/test_mvp_flows.py` corre 264/264 verde.

## Limitaciones

- El AuditEvent que emite `super().destroy()` no incluye los IDs de Payment y
  CashMovement borrados como side effect. Mejora pendiente para una iteracion
  futura del audit mixin.
- Esto es el fix puntual del bug. La convencion homogenea de borrado logico
  (mixin `SoftDeleteMixin` + manager por defecto) queda pendiente como
  refactor separado; ver el plan asociado.
