# Materiales: unidades abiertas

## Objetivo

El modulo de materiales soporta dos modos de consumo que conviven:

- consumo directo por unidad gastada;
- uso desde una unidad/envase abierto que puede participar en varios trabajos antes de descontar stock.

Ejemplo operativo: si hay 5 botellas de ceramico, abrir una botella no cambia el stock registrado. Esa unidad puede asociarse a varios trabajos. Cuando se finaliza, el stock baja de 5 a 4.

## Modelo

`MaterialOpenUnit` representa un envase o unidad abierta.

Campos principales:

- `material`: material asociado.
- `opened_at`: fecha de apertura.
- `opened_by_work_order`: trabajo que origino la apertura, opcional.
- `status`: `open` o `finished`.
- `finished_at`: fecha de cierre, solo cuando esta finalizada.
- `stock_quantity_to_decrement`: cantidad que se descuenta al finalizar, por defecto `1.00`.
- `estimated_unit_cost_at_open`: snapshot del costo unitario al abrir.
- `observations`: notas operativas.

`MaterialConsumption.open_unit` es opcional:

- si es `null`, el consumo es directo y descuenta `quantity` al crearse;
- si apunta a una unidad abierta, registra un uso parcial, deja `quantity = 0.00` y no descuenta stock.

## Endpoints

Abrir unidad:

```http
POST /api/material-open-units/
```

Payload minimo:

```json
{
  "material": 1,
  "opened_at": "2026-05-01",
  "opened_by_work_order": 10,
  "stock_quantity_to_decrement": "1.00",
  "observations": "Primera botella abierta"
}
```

Consumir desde unidad abierta:

```http
POST /api/material-open-units/{id}/consume/
```

Payload:

```json
{
  "work_order": 11,
  "consumed_at": "2026-05-03",
  "observations": "Segundo uso parcial"
}
```

Finalizar unidad:

```http
POST /api/material-open-units/{id}/finish/
```

Payload:

```json
{
  "finished_at": "2026-05-04"
}
```

## Reglas de stock

- `MaterialPurchase` sigue sumando stock como antes.
- `MaterialConsumption` directo sigue descontando stock al crearse y devolviendolo al borrarse.
- Abrir `MaterialOpenUnit` no descuenta stock.
- Usar `MaterialOpenUnit.consume` no descuenta stock.
- Finalizar `MaterialOpenUnit.finish` descuenta `stock_quantity_to_decrement` una sola vez.
- Una unidad finalizada no puede recibir mas consumos.

## Metricas

Cada unidad abierta expone:

- `work_orders_count`;
- `consumptions_count`;
- `duration_days`;
- `consumptions` asociados.

Cada material expone:

- `open_units_active_count`;
- `open_units_finished_count`;
- `average_jobs_per_finished_unit`;
- `average_days_per_finished_unit`.

Estas metricas son aproximadas y sirven para estimar cuantos trabajos o dias dura una unidad/envase.
