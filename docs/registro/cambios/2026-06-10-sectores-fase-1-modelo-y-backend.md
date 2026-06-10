# Sectores fase 1 - Modelo Sector, FKs denormalizados y API backend (2026-06-10)

## Contexto

Primera fase del cambio descrito en
`docs/registro/decisiones/2026-06-10-sectores-configurables-por-negocio.md`.
Introduce el modelo `Sector` y conecta las tres apps que lo necesitan
(catalog, scheduling, workorders) sin romper el comportamiento existente:
los FKs se crean como nullable para permitir el backfill antes de forzar
la restriccion.

## Nuevos archivos

- `backend/catalog/models.py` — modelo `Sector` (hereda `SoftDeleteMixin`):
  campos `key`, `name`, `color`, `icon`, `order`, `is_active`,
  `default_capacity`, `public_visible`. UniqueConstraint `(business, key)`
  con condicion soft-delete.
- `backend/catalog/sector_defaults.py` — `ensure_default_sectors(business)`:
  crea `lavadero` y `detailing` de forma idempotente; usado en data migrations,
  signup y seed_demo.
- `backend/catalog/serializers.py` — `SectorSerializer` con `BusinessScopedSerializerMixin`.
- `backend/catalog/views.py` — `SectorViewSet` (auth, employer-only para escritura,
  soft-delete en `perform_destroy`, proteccion de ultimo sector activo).
- `backend/tests/test_sectors.py` — tests de CRUD, scoping multi-tenant,
  idempotencia de `ensure_default_sectors`, bloqueo del ultimo sector, PROTECT.

## Migraciones

| App | Migracion | Contenido |
|---|---|---|
| catalog | `0006_sector` | `CreateModel(Sector)` |
| catalog | `0007_sector_service_sector_and_more` | `AddField(Service.sector nullable)` + data migration (sectores default + backfill por `service_type`) + copia de capacidades/visibilidad de `BusinessProfile` a sectores |
| scheduling | `0011_reservation_sector` | `AddField(Reservation.sector nullable)` + backfill desde `service.sector` |
| scheduling | `0012_reservation_sector` | (numeracion del repo) |
| workorders | `0006_workorder_sector` | `AddField(WorkOrder.sector nullable)` + backfill desde `reservation.sector` |

## Cambios funcionales

- `scheduling/models.py`: `capacity_for_day(day, business, sector)` y
  `used_slots_for_day(..., sector)` filtran por sector en vez de por tipo hardcodeado.
  `Reservation.save()` setea `sector` automaticamente desde `service.sector`.
- `scheduling/services.py`: `ensure_reservation_work_order` setea `WorkOrder.sector`
  desde `reservation.sector`.
- `config/urls.py`: `router.register("sectors", SectorViewSet)`.
- `config/views.py`: `TrialSignupSerializer.create` llama `ensure_default_sectors`.
- `catalog/admin.py`: `SectorAdmin` + campo `sector` en `ServiceAdmin`.
