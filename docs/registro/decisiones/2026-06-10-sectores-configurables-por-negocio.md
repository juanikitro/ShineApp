# Sectores configurables por negocio

## Contexto

ShineApp estaba cableada para exactamente dos rubros: **lavadero** y **detailing**.
El acoplamiento vivia en capas:

- `Service.service_type`: enum cerrado `{wash, detailing, combo}`.
- `BusinessProfile.default_capacity_wash/detailing` y
  `public_show_wash/detailing_services`: campos de config hardcodeados por tipo.
- `scheduling/models.py`: `WASH_BUCKET`/`DETAILING_BUCKET` como constantes; la
  capacidad y los slots se calculaban separando por tipo con un `bucket_for_service_type`.
- Frontend: toggle wash/detailing en la agenda, dobles inputs de capacidad en settings.

El duenio necesitaba que cualquier negocio pueda crear sus propios rubros (lubricentro,
taller, gomeria, etc.) sin tocar el codigo. Los dos tipos existentes debian sobrevivir
sin cambios para los usuarios activos.

## Decision

Se introduce el modelo `Sector` en `catalog/`, con FK `business` por negocio
(compatible con el multi-tenancy existente). Cada sector tiene `key` (slug inmutable
por business), `name` (editable), `color`, `icon`, `order`, `is_active`,
`default_capacity` y `public_visible`. El modelo hereda `SoftDeleteMixin`.

`Service.sector` reemplaza `Service.service_type`. `Reservation.sector` y
`WorkOrder.sector` son FKs denormalizados seteados al momento de crear cada entidad;
esto garantiza que el historial no cambie si un servicio se reasigna de sector.

El seeding de defaults es manejado por `catalog/sector_defaults.py::ensure_default_sectors(business)`,
que crea `lavadero` y `detailing` de forma idempotente. Se invoca desde:
- la data migration inicial (negocios existentes),
- `TrialSignupSerializer.create` (negocios nuevos),
- `seed_demo`.

### Backfill del enum

La data migration mapea `service_type → sector.key` con la tabla:

| service_type | sector.key |
|---|---|
| wash | lavadero |
| combo | lavadero |
| detailing | detailing |

Los combos van a lavadero porque asi se contaba su capacidad antes.

## Arquitectura del cambio (4 fases)

**Fase 1** — Backend: modelo `Sector`, FKs nullable + backfill en tres apps
(catalog, scheduling, workorders), `SectorViewSet` + API, capacidad por sector en
scheduling, denormalizacion de `WorkOrder.sector` en `ensure_reservation_work_order`.

**Fase 2** — Frontend: dataset `sectors` en data-loading/app-data, CRUD de sectores
en Settings, badge de sector en Servicios, agenda con selector dinamico de sector y
modo "Todos" con carriles, capacidad por sector en formulario de reserva.

**Fase 3** — Dashboard segmentado por sector (`by_sector` en la API), landing publica
agrupa/filtra por `sector.public_visible` y expone disponibilidad por sector.

**Fase 4** — Contraccion: FKs pasan a `null=False` con migraciones defensivas
(assert antes del `AlterField`); se elimina `Service.service_type`, las constantes
`WASH_BUCKET/DETAILING_BUCKET`, y los cuatro campos por-tipo de `BusinessProfile`.

## Trade-offs

1. **Un servicio pertenece a exactamente un sector.** Reservas multiservicio usan
   el sector del item primario para calcular capacidad. Simplificacion de v1;
   extensible en el futuro.

2. **Sin horarios por sector en v1.** `opening_time/closing_time` son del negocio
   y se quedan en `BusinessProfile`. Si se necesitaran por sector se agregan como
   campos nullable con fallback al profile (cambio aditivo sin romper existente).

3. **Sector denormalizado en Reservation/WorkOrder.** Si el servicio cambia de
   sector despues, el historico no se recalcula. Misma semantica que los precios
   snapshot; se documenta como comportamiento intencional.

4. **Borrar un sector activo con datos esta bloqueado** (`PROTECT`). `perform_destroy`
   ofrece desactivar en vez de borrar si hay servicios/reservas ligadas.
   No se puede desactivar el ultimo sector activo (romperia el formulario de reserva).

5. **`key` es inmutable** tras la creacion. Garantiza estabilidad de referencias en
   code y migrations. `name` es libre para el usuario.
