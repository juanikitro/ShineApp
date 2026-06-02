# Django Admin completo para ShineApp

## Cambio

Se implementaron archivos `admin.py` completos y operativos para todas las apps Django del proyecto. El objetivo es que un operador sin acceso al frontend pueda gestionar el negocio íntegramente desde el admin.

## Apps cubiertas

| App | Modelos registrados | Destacados |
|-----|--------------------|-|
| `core` | BusinessAccount, BusinessProfile, AuditLog, PasswordResetToken | + site header/title/index |
| `customers` | Customer, Vehicle | VehicleInline, CSV export, contador de vehículos |
| `catalog` | Service | list_editable (precio, activo), fieldsets por tipo de vehículo |
| `scheduling` | Reservation, DailyCapacity | ReservationItemInline, CSV export, acciones bulk confirmar/cancelar |
| `workorders` | WorkOrder | Estado coloreado (proxy a reservation.status), acciones bulk de estado, CSV export, MaterialConsumptionInline readonly |
| `finance` | Payment, CashMovement, CashClosure | Solo superuser puede agregar/cambiar/eliminar; CSV export pagos |
| `inventory` | Material, Supplier, MaterialPurchase, MaterialConsumption, StockMovement, StockMovementLine, MaterialOpenUnit, Tool | Stock bajo mínimo resaltado en rojo, StockMovementLineInline |
| `quotes` | Quote, QuoteItem | Estado coloreado, acciones aprobar/rechazar |
| `notifications` | PublicRequest, PublicRequestItem | Acción archivar bulk |
| `debts` | Debt, DebtPayment | Estado calculado coloreado, DebtPaymentInline |

## Configuración global del admin

```python
admin.site.site_header = "ShineApp Backoffice"
admin.site.site_title = "ShineApp"
admin.site.index_title = "Panel de operaciones"
```

## Decisiones de diseño

- `status` de `WorkOrder` es una propiedad (proxy a `reservation.status`), no un campo DB. Se muestra via método `get_status` con badge coloreado. El filtro usa `reservation__status`.
- `balance_due`, `paid_amount` y `material_cost` de `WorkOrder` son propiedades con queries; se usan solo en `readonly_fields` (vista de formulario), no en `list_display`, para evitar N+1 en el changelist.
- `Finance` (Payment, CashMovement, CashClosure) restringido a `is_superuser`; la lógica de roles empleador/empleado se documenta como deuda técnica (ver decisión).
- CSV export disponible en: Customers, Reservations, WorkOrders, Payments.
- `autocomplete_fields` configurados en todos los FKs frecuentes; cada modelo target tiene `search_fields` definidos.

## Validación

- `manage.py check`: sin issues.
- `pytest`: 207 tests, 0 fallos.
- No se modificaron modelos ni migraciones; este cambio es solo de capa admin.
