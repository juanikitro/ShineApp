# Sectores fase 4 - Limpieza legacy: service_type y campos por tipo eliminados (2026-06-10)

## Contexto

Cuarta y ultima fase del cambio descrito en
`docs/registro/decisiones/2026-06-10-sectores-configurables-por-negocio.md`.
Contrae el esquema expand-then-contract: los FKs de sector pasan a `null=False`
y se elimina todo el codigo legacy de `service_type` y los campos por-tipo
de `BusinessProfile`.

## Migraciones (patron defensivo)

Cada migracion que hace `AlterField null=False` incluye un `RunPython` previo
que levanta `RuntimeError` si encuentra filas con sector `NULL`, garantizando
que el backfill de fases anteriores fue completo antes de forzar la restriccion.

| App | Migracion | Contenido |
|---|---|---|
| catalog | `0008_make_service_sector_required` | assert + `AlterField(Service.sector null=False PROTECT)` |
| catalog | `0009_remove_service_service_type` | `RemoveField(service_type)` + `AlterModelOptions(ordering=['sector__order','name'])` |
| scheduling | `0013_make_reservation_sector_required` | assert + `AlterField(Reservation.sector null=False PROTECT)` |
| workorders | `0007_make_workorder_sector_required` | assert + `AlterField(WorkOrder.sector null=False PROTECT)` |
| core | `0024_remove_legacy_capacity_visibility_fields` | `RemoveField` x4: `default_capacity_wash`, `default_capacity_detailing`, `public_show_wash_services`, `public_show_detailing_services` |

## Codigo eliminado

- `Service.ServiceType` (enum `wash/detailing/combo`) y su campo `service_type`.
- `BusinessProfile.default_capacity_wash/detailing` y `public_show_wash/detailing_services`.
- Constantes `WASH_BUCKET`/`DETAILING_BUCKET` y `bucket_for_service_type` en scheduling.
- `"service_type"` de `ServiceSerializer.Meta.fields`.
- Campos legacy del serializer de perfil en `config/views.py` y sus validators.
- `service_type` de `ServiceAdmin`.
- Busqueda por `service_type__icontains` en `ServiceViewSet` (reemplazada por `sector__name__icontains`).

## Tests actualizados

14 archivos de tests migraron de `service_type=Service.ServiceType.*` a
asignaciones por sector via `ensure_default_sectors(business)`:
`test_mvp_flows.py`, `test_business_profile.py`, `test_seed_demo.py`,
`test_public_landing_requests.py`, `test_reservation_overlap.py`,
`test_stock_movements.py`, `test_vehicle_type_pricing.py`,
`test_multitenancy.py`, `test_workorders.py`, `test_dashboard_series.py`,
`test_reservation_status_flags.py`, `test_reservation_exit_day.py`,
`test_audit_log.py`, `test_finance_categories_payments.py`, `test_sectors.py`.

Suite final: **298 tests, 0 fallos**.
