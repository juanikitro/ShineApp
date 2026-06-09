# Soft delete homogeneo con `SoftDeleteMixin` y convivencia con `is_active`

## Contexto

El borrado en ShineApp era heterogeneo: algunos modelos hacian soft delete
sobreescribiendo `delete()` para setear `is_active=False` (`Customer`,
`Vehicle`, `Service`, `Material`, `Tool`, `Supplier`, `RecurringDebt`),
otros borraban fisico (`Reservation`, `WorkOrder`, `Payment`,
`CashMovement`, `Debt`, `DebtPayment`, etc.), y no existia un mixin
compartido ni un manager con filtro por defecto. El filtrado de borrados
se hacia en cada ViewSet via `ActiveQuerysetMixin` con el query param
`include_inactive=1`, sin tocar el manager — eso significa que cualquier
related query reverse (`customer.reservations`, `vehicle.work_orders`)
seguia viendo registros con `is_active=False`.

El disparador concreto fue un bug: borrar una reserva ya cobrada fallaba
con `ProtectedError` 500 porque la cascada DB chocaba contra
`Payment.work_order` PROTECT. El fix puntual ya esta en
`docs/registro/cambios/2026-06-08-borrado-reserva-con-cobro.md`. Este ADR
documenta la convencion mas amplia para que el resto del sistema se
alinee gradualmente.

## Decision

Se introduce `backend/core/soft_delete.py` con tres piezas reusables:

- `SoftDeleteQuerySet`: override de `.delete()` que setea `deleted_at`
  en bulk, y metodos `hard_delete()`, `alive()`, `dead()` para casos de
  admin/recuperacion.
- `SoftDeleteManager`: extiende `Manager.from_queryset(SoftDeleteQuerySet)`
  y filtra `deleted_at__isnull=True` en `get_queryset()`.
- `SoftDeleteMixin` (abstracto): agrega `deleted_at` (nullable, indexado),
  define `objects = SoftDeleteManager()` y `all_objects = Manager(...)`
  para acceso completo, y setea `Meta.base_manager_name = "objects"`
  para que los related managers reverse tambien filtren. Sobrescribe
  `delete()` para hacer soft y deja `hard_delete()` para el borrado real.

La propagacion en cascada **no es automatica**: cada modelo padre que
adopte el mixin debe sobrescribir su `delete()` para propagar
explicitamente a sus hijos relevantes, envuelto en `transaction.atomic`.
Esto se eligio sobre cascadas DB porque mantiene los side effects
visibles en el codigo Python (en lugar de esconderlos en `on_delete`) y
porque el override soft delete no llama `super().delete()`, asi que la
cascada DB no se dispara sola.

## Convivencia con `is_active`

`is_active=False` y `deleted_at IS NOT NULL` representan dos cosas
distintas y se conservan ambas:

- `is_active=False` = "no aparece en pickers/listados por defecto, pero
  existe y se puede reactivar". Es la semantica que ya usan Customer,
  Vehicle, Service, Material, Tool, Supplier — y entrega valor real
  (cliente pausado, servicio descontinuado, herramienta fuera de uso).
- `deleted_at != NULL` = "borrado logico definitivo, no debe aparecer
  salvo en admin/recuperacion".

Concretamente: los modelos que hoy usan `is_active` **no se migran** al
mixin en esta iteracion. Su override `delete()` actual ya entrega lo
que se necesita. Si en el futuro auditoria pide saber "cuando fue
borrado", se suma `deleted_at` como capa adicional sin remover
`is_active`.

## Fases de migracion

**Fase 1** (siguiente paso): aplicar `SoftDeleteMixin` a las cuatro
entidades del bug detectado:

- `Reservation` (`scheduling`)
- `WorkOrder` (`workorders`)
- `Payment` (`finance`)
- `CashMovement` (`finance`)

Cada una recibe migracion de schema para `deleted_at` y override
`delete()` con propagacion explicita a los hijos:

- `Reservation.delete()` propaga a su `work_order` (OneToOne reverse).
- `WorkOrder.delete()` propaga a `payments`, `material_consumptions` y
  `stock_movements` ligados.
- `Payment.delete()` propaga a su `cash_movement` (OneToOne reverse).
- `CashMovement.delete()` solo se marca a si mismo.

`ReservationViewSet.destroy` y `PaymentViewSet.perform_destroy` se
simplifican: las validaciones de pre-condicion (caja abierta, sin
inventario) se mantienen, pero el borrado en cascada queda delegado al
override del modelo.

**Fase 2** (cuando Fase 1 este estable): `Quote/QuoteItem`,
`Debt/DebtPayment`, `ReservationItem`. Mismo patron.

**Fase 3** (solo si hay demanda): sumar `deleted_at` a Customer,
Vehicle, Service, Material, Tool, Supplier conservando `is_active`.
Esto requiere ajustar unique constraints existentes con
`condition=Q(deleted_at__isnull=True)` para evitar colisiones al
recrear.

**Modelos que se quedan fisicos a proposito**:

- `AuditLog`, `CashClosure`: contratos inmutables, soft delete los
  corrompe.
- Tokens (`PasswordResetToken`, etc.): TTL natural, soft delete no
  aporta valor.
- `MaterialPurchase`, `MaterialConsumption`, `StockMovement/Line`:
  documentos contables. Se mantiene guard duro en sus ViewSets
  ("revertilo manualmente") en vez de cascadas implicitas.

## Trade-offs

1. **`base_manager_name = "objects"` cambia silenciosamente las related
   queries**. Codigo que asumia ver soft-deleted (poco probable pero
   posible en admin/auditoria) ahora ve `DoesNotExist`. Mitigacion:
   grep de cada relacion reverse antes de cada fase. Se documenta
   `all_objects` como escape hatch explicito.

2. **Cascada manual vs DB cascade**: el override `delete()` no es
   atomico con la DB por si solo. Mitigacion: envolver siempre en
   `transaction.atomic`. Es el mismo patron que `PaymentViewSet` y
   `DebtViewSet` ya usan hoy.

3. **Unique constraints con soft delete**: en Fase 3, `Vehicle` y
   cualquier otro con UniqueConstraint sobre campos editables necesita
   `condition=Q(deleted_at__isnull=True)` o habra colisiones al recrear
   un registro con el mismo identificador. No es problema en Fase 1
   (Reservation/WorkOrder/Payment/CashMovement no tienen unique sobre
   campos editables).

4. **Performance del indice `deleted_at`**: trivial en Reservation,
   WorkOrder y Payment. CashMovement puede crecer mas; medir despues
   si genera presion en queries.

5. **Bulk delete a traves del manager**: `Model.objects.filter(...).delete()`
   ahora hace soft delete (porque `SoftDeleteQuerySet.delete()` es
   override). Para purgar definitivamente, usar
   `Model.all_objects.filter(...).hard_delete()`.

## Validacion esperada

- Los tests existentes que assertean
  `assert not Model.objects.filter(pk=...).exists()` siguen verde
  porque el manager filtra `deleted_at__isnull=True`.
- Los tests nuevos deben verificar acceso al registro borrado via
  `Model.all_objects.get(pk=...)` con `deleted_at != None`.
- `manage.py makemigrations --check --dry-run` no debe generar
  migraciones inesperadas (las migrations se crean explicitamente).
- Flujo manual: borrar reserva con cobro -> en DB la reserva, el
  workorder, el payment y el cashmovement tienen `deleted_at` seteado;
  desaparecen de los listados normales pero existen via `all_objects`.
