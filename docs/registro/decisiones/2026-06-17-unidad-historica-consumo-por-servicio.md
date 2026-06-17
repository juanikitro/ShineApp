# Unidad historica y consumo de producto por servicio

## Contexto

Se quiere estimar cuanto producto gasta cada servicio. El modelo ya tenia el
ciclo de vida (`MaterialOpenUnit`: `opened_at`/`finished_at`, `duration_days`,
`work_orders_count`) y los promedios por unidad finalizada, pero solo se podia
alimentar trackeando en vivo (abrir -> consumir -> finalizar, que descuenta
stock). Cargar datos pasados con ese flujo descontaria stock que ya se consumio.

## Decisiones

- **El registro retroactivo no descuenta stock actual.** Campo
  `MaterialOpenUnit.is_historical`. El consumo ocurrio en el pasado y el stock de
  hoy ya lo refleja; descontar de nuevo seria doble conteo. El cierre en vivo
  (`finish`) sigue descontando `stock_quantity_to_decrement`; son dos flujos
  distintos y explicitos. El backfill no exige stock disponible (puede ser 0).
- **Una unidad historica = un solo servicio.** Campo `MaterialOpenUnit.service`
  (nullable; solo lo setea el backfill). El endpoint valida que todas las
  reservas sean del mismo servicio. Da un rendimiento atribuible y limpio
  ("1 unidad rinde N servicios de tipo X").
- **Consumo estimado por servicio = producto total consumido / trabajos
  cubiertos**, sobre las unidades historicas finalizadas de (material, servicio):
  `sum(stock_quantity_to_decrement) / sum(work_orders distintos)`. El costo por
  servicio usa el mismo ratio sobre `material.estimated_unit_cost`.
- **La vista cruzada del panel se deriva client-side** de `materialOpenUnits` ya
  cargadas (filtro `is_historical && finished && service`). El endpoint
  `GET /materials/service-usage/` es la fuente canonica (consumidores externos,
  reportes). Se acepta la minima duplicacion de la formula para no cablear un
  dataset nuevo en `page.tsx` (~13k lineas, alto riesgo de churn).
- **Volcado a receta opcional.** `ServiceMaterial.quantity` tiene 3 decimales; el
  endpoint `service-usage` reporta 4 (analisis). El volcado redondea a 3 al
  hacer `upsert`.

## Consecuencias

- Las unidades historicas son `FINISHED`, asi que alimentan los promedios
  existentes `average_jobs/days_per_finished_unit` (cuentan todas las finalizadas).
- No cambia el flujo en vivo de abrir/cerrar ni el descuento de stock real.
- El backfill es atribuible y auditable (`is_historical`, `service`, audit event
  `register_usage`).

## Validacion esperada

- `pytest` inventory verde, incluyendo `tests/test_material_usage_backfill.py`.
- Los asserts de promedios de unidades existentes siguen pasando sin cambios.
- `makemigrations --check`: solo la migracion `inventory/0015`.
