# Soft delete fase 2 - Quote, QuoteItem, Debt, DebtPayment, ReservationItem (2026-06-08)

## Contexto

Segunda fase del refactor de borrado logico (ver ADR
`docs/registro/decisiones/2026-06-08-soft-delete-mixin-global.md`).
Cubre las entidades que estaban con borrado fisico, no tenian
`is_active` y son hijas o derivadas de las migradas en Fase 1.

## Modelos migrados

| Modelo | App | Migracion |
|---|---|---|
| `Quote` | quotes | `0005_alter_quote_options_alter_quoteitem_options_and_more.py` |
| `QuoteItem` | quotes | (misma migracion) |
| `Debt` | debts | `0006_alter_debt_options_alter_debtpayment_options_and_more.py` |
| `DebtPayment` | debts | (misma migracion) |
| `ReservationItem` | scheduling | `0010_alter_reservationitem_options_and_more.py` |

Cada migracion agrega `deleted_at DateTimeField(null=True, blank=True, db_index=True)`
y setea `base_manager_name = "objects"` en el Meta.

## Propagacion en cascada

- `Quote.delete()` propaga a sus `items` (`QuoteItem`).
- `Debt.delete()` desasocia y borra su `cash_movement` espejo (`OneToOneField PROTECT`).
- `DebtPayment.delete()` y `QuoteItem.delete()` quedan con el override del mixin.
- `ReservationItem.delete()` queda con el override del mixin.
- `Reservation.delete()` (Fase 1) se amplio para tambien propagar a sus `items`.

## Simplificacion de view

- `DebtViewSet.perform_destroy` ya no desasocia el `cash_movement`
  manualmente; ese trabajo vive ahora en el override `Debt.delete()`.
  El viewset conserva el guard de negocio ("no se puede eliminar una
  deuda con pagos registrados") y la validacion de caja abierta.

## Notas

- `Quote.reservation` es `on_delete=SET_NULL`, asi que al borrar una
  reserva la cotizacion asociada queda con `reservation=NULL` (sigue
  existiendo como historico). No cambia con esta fase.
- El test integral de Fase 1 (`test_delete_canceled_reservation_soft_deletes_cascade_entities`)
  ya cubre la propagacion Reservation -> WorkOrder -> Payment ->
  CashMovement. La extension a `items` se valida implicitamente al
  hacer DELETE a reservas con items.

## Pendiente

Fase 3 (`Customer`, `Vehicle`, `Service`, `Material`, `Tool`,
`Supplier`, `RecurringDebt`) se hace en commit aparte.
