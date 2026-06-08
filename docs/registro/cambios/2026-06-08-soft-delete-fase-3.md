# Soft delete fase 3 - Customer, Vehicle, Service, Material, Tool, Supplier, RecurringDebt (2026-06-08)

## Contexto

Tercera fase del refactor de borrado logico. Cubre los modelos que
hoy usan `is_active` como semantica de "pausado/no listado" y ademas
expone el query param `include_inactive=1` desde sus ViewSets. El
objetivo es agregar `deleted_at` como capa adicional para trazabilidad
de borrado, conservando la semantica existente de `is_active`.

## Modelos migrados

| Modelo | App | Migracion |
|---|---|---|
| `Customer` | customers | `0009_alter_customer_options_alter_vehicle_options_and_more.py` |
| `Vehicle` | customers | (misma migracion) |
| `Service` | catalog | `0006_alter_service_options_service_deleted_at.py` |
| `Material` | inventory | `0009_alter_material_options_alter_supplier_options_and_more.py` |
| `Tool` | inventory | (misma migracion) |
| `Supplier` | inventory | (misma migracion) |
| `RecurringDebt` | debts | `0007_alter_recurringdebt_options_recurringdebt_deleted_at.py` |

## Convivencia con `is_active`

Conforme al ADR, se conservan ambos conceptos:

- `is_active=False AND deleted_at IS NULL`: el registro fue **pausado
  manualmente** (cliente sin actividad por un tiempo, servicio
  descontinuado, plantilla recurrente en pausa). Se puede reactivar.
- `deleted_at IS NOT NULL`: el registro fue **borrado**. Tambien queda
  `is_active=False` para conservar el comportamiento de la UI legacy.

El override `delete()` en cada modelo ahora setea ambos campos:

```python
self.is_active = False
self.deleted_at = timezone.now()
self.save(update_fields=["is_active", "deleted_at", "updated_at"])
```

## Unique constraints actualizados

Para permitir recrear un registro con el mismo identificador despues
de un borrado logico, los constraints relevantes ahora excluyen
soft-deleted:

- `Vehicle.unique_vehicle_license_plate_per_business_when_present`:
  `~Q(license_plate="") & Q(deleted_at__isnull=True)`.
- `Material.unique_material_sku_per_business_when_present`:
  `~Q(sku="") & Q(deleted_at__isnull=True)`.

Los demas modelos de esta fase no tienen constraints sobre campos
editables.

## `ActiveQuerysetMixin` y `ToolViewSet`: query param `include_inactive`

El query param `include_inactive=1` sigue funcionando pero ahora levanta
los dos filtros (is_active y deleted_at) y usa el manager `all_objects`:

- `customers.ActiveQuerysetMixin.get_queryset()` ahora detecta el
  param y arranca de `Model.all_objects.all()` cuando esta presente.
  Asi los listados con `include_inactive=1` muestran activos +
  pausados + borrados, en linea con la expectativa del frontend.
- `inventory.ToolViewSet.get_queryset()` (que no usa el mixin) se
  ajusto para el mismo patron.

## Simplificacion

- `debts.RecurringDebtViewSet.perform_destroy` ya no setea
  `is_active=False` manualmente antes de `instance.delete()`; el
  override del modelo lo hace en un solo paso.

## Ajuste de audit log

`AuditedModelViewSetMixin.destroy` necesita ver la instancia despues
del soft delete para capturar el snapshot `after`. Como el manager
`objects` filtra soft-deleted, se cambio para consultar via
`all_objects` cuando el modelo lo expone. Esto restaura el snapshot
`after` con `is_active=False` y `deleted_at != null` en el audit
event de `delete`.

## Tests

- Test nuevo en `backend/tests/test_mvp_flows.py`:
  - `test_vehicle_unique_license_plate_allows_recreate_after_soft_delete`:
    borra un vehiculo y crea otro con la misma patente; verifica que
    el unique constraint condicional permite la recreacion.
- Test ajustado en `backend/tests/test_audit_log.py`:
  - `test_soft_delete_and_custom_actions_are_audited`: usa
    `Service.all_objects.get(pk=...)` para validar el estado post
    delete (refresh_from_db ya no lo encuentra via manager normal).

Suite completa: 266/266 verde.

## Limitaciones / notas

- Si en data legacy hay registros con `is_active=False` y
  `deleted_at IS NULL`, el listado con `include_inactive=1` los
  muestra junto con los borrados. La UI no distingue visualmente entre
  "pausado" y "borrado"; si en el futuro se necesita esa distincion,
  agregar un filtro o badge basado en `deleted_at`.
- `Quote.public_code` tiene `unique=True` sin condicional. Si en el
  futuro hay riesgo real de colision al recrear codigos publicos
  despues de un soft delete, agregar `condition=Q(deleted_at__isnull=True)`.
  Hoy el codigo se genera por fecha + id en base36, asi que la
  colision es improbable.
