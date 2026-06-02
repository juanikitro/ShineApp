# Pricing por tipo de vehiculo

## Contexto

El negocio cobra distinto el mismo servicio segun el tipo de vehiculo (moto, auto, camioneta, combi). El modelo tenia un unico `Service.base_price` que se materializaba en `ReservationItem.unit_price`, `QuoteItem.unit_price` y `WorkOrder.total_amount`.

## Decision

- Almacenamiento por columnas: cuatro precios nullable en `Service` (`price_moto/auto/camioneta/combi`), no una tabla relacional, por ser un set fijo y enumerado y para mantener el diff chico.
- `base_price` se conserva como precio base y fallback. `Service.price_for(vehicle_type)` devuelve el precio del tipo si no es nulo (respeta `0`), si no `base_price`.
- `VehicleType` (`moto/auto/camioneta/combi`) vive en `core.models` y lo comparten `catalog` y `customers`.
- `vehicle_type` obligatorio en formularios con default `auto`, y backfill de los vehiculos existentes a `auto` via default de la migracion. Trade-off aceptado: motos/combis ya cargadas quedan como `auto` hasta corregirlas; solo afecta su proximo trabajo, no los historicos.
- Los cuatro precios por tipo se agregan a `economy_fields` del `ServiceSerializer`: son informacion economica y se ocultan al empleado, igual que `base_price`.
- Re-precio automatico en frontend: al cambiar el vehiculo de una reserva/cotizacion, las lineas de servicio se recalculan al precio del nuevo tipo (sobrescribe lo tipeado a mano).

## Landing publica

- El formulario publico pide el tipo de vehiculo (default `auto`). `PublicRequest` guarda `vehicle_type`; al convertir la solicitud el vehiculo se crea con ese tipo y la reserva/cotizacion cobra el precio del tipo via `price_for(...)`. La landing sigue sin exponer precios.

## Validacion esperada

- `Service.price_for(tipo)` devuelve el precio del tipo, o `base_price` cuando el tipo no tiene precio o esta vacio; un precio por tipo de `0` se respeta.
- Una reserva u orden con vehiculo tipado toma el precio del tipo; sin tipo o sin precio por tipo, toma `base_price`.
- Un empleado no ve `price_moto/auto/camioneta/combi` (ni `base_price`) en `/api/services/`.
- Reservas, ordenes y cotizaciones historicas conservan sus importes.
