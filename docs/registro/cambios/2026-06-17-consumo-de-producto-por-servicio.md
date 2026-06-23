# Consumo de producto por servicio: registro historico (2026-06-17)

**Objetivo:** estimar cuanto producto gasta cada servicio cargando unidades de
producto ya consumidas en el pasado, sin tener que haberlas trackeado en vivo.
Reusa el modelo de ciclo de vida existente (`MaterialOpenUnit`: apertura/cierre,
`duration_days`, `work_orders_count`) y los promedios ya expuestos
(`average_jobs/days_per_finished_unit`).

## Backend

**Modelo (`inventory/models.py`, migracion `inventory/0015_open_unit_service_historical.py`)**
- `MaterialOpenUnit.service` -> FK `catalog.Service` (null, PROTECT, related_name
  `material_open_units`): servicio al que se atribuye la unidad.
- `MaterialOpenUnit.is_historical` -> bool (default False): registro retroactivo
  que **no descuenta stock actual** (ver decision del 2026-06-17).
- `MaterialOpenUnitSerializer` expone `service`, `service_name`, `is_historical`.

**Endpoint backfill: `POST /material-open-units/register-usage/`** (`register_usage`,
`detail=False`, `CanViewEconomy`). Payload:
`{material, service, reservations: [id...], opened_at?, finished_at?, stock_quantity_to_decrement?=1, observations?}`.
- Valida **un solo servicio por unidad**: toda reserva debe tener `service_id`
  igual al `service` enviado. `validate_same_business` cubre cross-tenant.
- `opened_at`/`finished_at` por defecto = min/max de `reservation.day`.
- Crea una `MaterialOpenUnit` `FINISHED` + `is_historical=True` y un
  `MaterialConsumption` (quantity 0) por reserva via
  `ensure_reservation_work_order`. No toca `material.stock_quantity`.
- Logica en `inventory/serializers.py::MaterialUsageBackfillSerializer`.

**Consumo estimado por servicio: `GET /materials/service-usage/`** (`service_usage`,
`detail=False`, `CanViewEconomy`). Agrupa unidades historicas finalizadas por
(material, servicio) y devuelve `{"results": [...]}` con
`estimated_consumption_per_service` (producto total / trabajos cubiertos, 4 dec),
`estimated_cost_per_service` (2 dec), `units_count`, `total_jobs`,
`avg_jobs_per_unit`, `avg_days_per_unit`. Serializer `ServiceUsageRowSerializer`.

**Volcado a receta: `POST /service-materials/upsert/`** (catalog,
`EmployerRequiredForUnsafe`): crea o actualiza `ServiceMaterial(service, material)`
en una sola llamada, evitando el `unique_together`.

## Frontend

- Seccion **Materiales**: boton "Consumo historico" (`InventoryPanel`) abre el
  modal `formModal.kind === 'material-historical-usage'`. Flujo: Producto +
  Servicio (`SearchSelect`) -> lista de reservas pasadas del servicio
  (`usage-reservation-list`, checkbox; filtra `day <= hoy` y `status != canceled`)
  -> apertura/cierre auto = min/max de la seleccion (editables) -> preview de
  rendimiento ("1 unidad rinde N servicios -> ~1/N por servicio, costo") ->
  `saveHistoricalUsage` postea a `register-usage`.
- Checkbox "Actualizar la receta del servicio": tras registrar, hace `upsert` con
  `quantity = stock_quantity_to_decrement / work_orders_count` (3 decimales).
- Tarjetas **"Consumo por servicio"** en `InventoryPanel`, derivadas client-side
  de `materialOpenUnits` historicas finalizadas (mismo calculo que el endpoint).
- `lib/data-loading.ts`: la seccion `inventory` ahora carga `services`.

## Tests / validacion

- Backend nuevo: `backend/tests/test_material_usage_backfill.py` (8 tests:
  backfill no toca stock, funciona con stock 0, fechas explicitas, rechaza
  reservas de otro servicio, requiere >=1 reserva, service-usage estima
  consumo/costo, vacio sin historicos, upsert crea-luego-actualiza).
- `pytest` inventory/open-units existentes: verdes (sin cambios de assert).
- `ruff check inventory/ catalog/`: limpio. `tsc --noEmit`: limpio.
  `vitest run`: 433 verdes.
- Pendiente CI: `eslint`/`prettier`/`next build` no se corrieron localmente
  (eslint y sus deps no estan instalados en el entorno; `prettier --check` no
  pasa en `main` bajo su propia config, asi que no es gate local). El estilo
  agregado sigue la convencion del repo (tabs, sin `;`, comillas simples).
