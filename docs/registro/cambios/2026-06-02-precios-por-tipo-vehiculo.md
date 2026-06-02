# Precios por tipo de vehiculo

## Cambio funcional

- Cada `Service` mantiene `base_price` y suma cuatro precios opcionales por tipo de vehiculo: `price_moto`, `price_auto`, `price_camioneta`, `price_combi`. Si un tipo no tiene precio cargado, se usa `base_price`.
- Cada `Vehicle` tiene `vehicle_type` (`moto`, `auto`, `camioneta`, `combi`), obligatorio en los formularios y con default `auto`. Los vehiculos ya cargados quedaron como `auto`.
- Al armar reservas, cotizaciones y ordenes, el `unit_price`/`total_amount` se resuelve automaticamente con el precio del tipo del vehiculo (`Service.price_for(vehicle_type)`), con fallback a `base_price`.
- UX del formulario de servicio: al cargar el "precio base" se copia a los cuatro tipos; cada tipo se puede ajustar individualmente y se respeta lo editado a mano.
- UX de reserva/cotizacion: al elegir o cambiar el vehiculo, las lineas de servicio se re-precifican al precio del nuevo tipo.
- El formulario publico de landing pide el tipo de vehiculo; la solicitud lo guarda y al convertirla el vehiculo creado y los precios usan ese tipo. La landing sigue sin mostrar precios.

## Contrato API

- `GET/POST/PATCH /api/services/` exponen y aceptan `price_moto`, `price_auto`, `price_camioneta`, `price_combi` (decimales opcionales, `>= 0`). Quedan ocultos para usuarios sin economia, igual que `base_price`.
- `GET/POST/PATCH /api/vehicles/` exponen y aceptan `vehicle_type` y exponen `vehicle_type_label` (solo lectura).
- `Service.price_for(vehicle_type)` devuelve el precio del tipo si esta cargado (incluido `0`), si no `base_price`.
- `POST /api/public/landing/{slug}/requests/` acepta `vehicle_type`; `/api/public-requests/` expone `vehicle_type` y `vehicle_type_label`.

## Compatibilidad

- Los precios por tipo son nullable; un servicio sin ellos cobra `base_price` como hasta ahora.
- Reservas, ordenes y cotizaciones historicas no se recalculan: la resolucion por tipo aplica solo a nuevas materializaciones de `unit_price`/`total_amount`.
- Migraciones: `catalog/0004` agrega los cuatro precios nullable; `customers/0007` agrega `vehicle_type` con default `auto` (rellena los vehiculos existentes).
