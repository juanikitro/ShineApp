# Soft delete fase 1 - Reservation, WorkOrder, Payment, CashMovement (2026-06-08)

## Contexto

Primera fase de la convencion de borrado logico definida en el ADR
`docs/registro/decisiones/2026-06-08-soft-delete-mixin-global.md`. Las
cuatro entidades del bug que motivo el cambio adoptan `SoftDeleteMixin`,
de manera que el borrado se vuelve reversible y trazable, y la cascada
queda explicita en el codigo Python en vez de en `on_delete` DB.

## Modelos migrados

| Modelo | App | Migracion |
|---|---|---|
| `Reservation` | scheduling | `0009_alter_reservation_options_reservation_deleted_at.py` |
| `WorkOrder` | workorders | `0005_alter_workorder_options_workorder_deleted_at.py` |
| `Payment` | finance | `0007_alter_cashmovement_options_alter_payment_options_and_more.py` |
| `CashMovement` | finance | (misma migracion) |

Cada migracion agrega `deleted_at DateTimeField(null=True, blank=True, db_index=True)`
y setea `base_manager_name = "objects"` para que los related managers
reverse tambien filtren registros borrados.

## Propagacion en cascada (override `delete()`)

- `Reservation.delete()` propaga a su `work_order` (OneToOne reverse) si
  existe, dentro de `transaction.atomic`. Usa `_skip_work_order_sync`
  para no re-disparar `ensure_reservation_work_order` cuando guarda
  `deleted_at`.
- `WorkOrder.delete()` propaga a todos sus `payments` activos.
- `Payment.delete()` propaga a su `cash_movement` (OneToOne reverse) si
  existe.
- `CashMovement.delete()` queda con el comportamiento del mixin
  (solo se marca a si mismo).

## Simplificacion de views

- `ReservationViewSet.destroy` (`backend/scheduling/views.py`) ya no
  borra manualmente `CashMovement` y `Payment`; mantiene los guards
  (estado `CANCELED`, sin movimientos de inventario, todas las cajas
  del dia de cada pago abiertas) y delega la cascada al override del
  modelo.
- `PaymentViewSet.perform_destroy` (`backend/finance/views.py`) ya no
  hace `CashMovement.objects.filter(payment=instance).delete()`; el
  override de `Payment.delete()` se encarga.

## CashMovement espejo de inventario (hard delete)

Los `CashMovement` ligados a `MaterialPurchase` o `StockMovement` no
representan cobros independientes, son views derivadas que se
recalculan cuando cambia la operacion de inventario. Para evitar
chocar con el `UNIQUE constraint` del OneToOne `stock_movement_id` /
`material_purchase_id` al recrear el espejo, esos puntos usan
`hard_delete()` en lugar de `delete()`:

- `inventory/serializers.py`: `sync_material_purchase_cash_movement`,
  `sync_stock_movement_cash_movement`, `reverse_stock_movement_effects`.

Esto preserva el contrato de espejo "siempre refleja la operacion
viva" sin romper la convencion soft delete del resto del sistema.

## Tests de regresion

Nuevo test integral en `backend/tests/test_mvp_flows.py`:

- `test_delete_canceled_reservation_soft_deletes_cascade_entities`:
  borra una reserva cancelada cobrada y verifica via `all_objects`
  que las cuatro entidades (Reservation, WorkOrder, Payment,
  CashMovement) quedan con `deleted_at` seteado y desaparecen de los
  queries normales.

Suite completa: 265/265 verde.

## Manager: `objects` vs `all_objects`

- `Model.objects.filter(...)`: solo registros vivos
  (`deleted_at IS NULL`). Es lo que usan ViewSets, serializers,
  aggregates y reportes.
- `Model.all_objects.filter(...)`: incluye registros borrados. Uso
  esperado: admin, scripts de recuperacion, auditoria. No usarlo en
  rutas normales.
- `Model.objects.filter(...).delete()` ahora hace soft delete y
  retorna `(count, {label: count})` para mantener compatibilidad con
  el codigo que asume la firma de Django.
- `Model.all_objects.filter(...).hard_delete()` para purgar
  definitivamente.

## Limitaciones conocidas

- `select_related("work_order")` no aplica el manager de WorkOrder en
  el JOIN, asi que un WorkOrder soft-deleted puede aparecer si la
  Reservation contenedora no lo esta. En la practica esto no ocurre
  porque la cascada los marca juntos. Si en el futuro hace falta
  filtrar explicitamente, agregar `.filter(work_order__deleted_at__isnull=True)`.
- El audit event que emite `super().destroy()` aun no incluye los IDs
  de hijos borrados como side effect explicito. Mejora pendiente.
- Modelos no migrados (Quote, Debt, DebtPayment, ReservationItem,
  etc.) siguen con su comportamiento previo. Los puntos contables
  estructurales (MaterialPurchase, MaterialConsumption,
  StockMovement, CashClosure, AuditLog) se quedan fisicos por
  diseno; ver el ADR.
