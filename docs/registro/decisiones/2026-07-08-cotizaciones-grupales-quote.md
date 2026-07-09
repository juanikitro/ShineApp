# Cotizaciones grupales sobre Quote

Fecha: 2026-07-08

## Decision

Las cotizaciones grupales se modelan extendiendo `Quote` con `is_group` y lineas hijas de auto, en lugar de crear un documento comercial separado.

Cada `QuoteVehicleLine` concentra el auto, la agenda propia, las notas, el subtotal y el vinculo opcional con su reserva hija. Cada `QuoteVehicleLineItem` concentra los servicios y precios de esa linea. El total del `Quote` grupal se calcula sumando los items de todas las lineas.

## Alternativas descartadas

- Crear un modelo `QuoteGroup` separado: duplicaba estados comerciales, PDF, permisos y acciones de envio.
- Crear varias cotizaciones individuales enlazadas por lote: hacia mas dificil imprimir, enviar y encontrar un unico documento comercial.
- Crear una unica reserva con varios autos: mezclaba la agenda operativa, cupos y trabajos, que siguen siendo por auto.

## Consecuencias

- Las cotizaciones individuales mantienen su contrato actual.
- La agenda sigue mostrando reservas individuales.
- `has_reservation` en grupos solo es verdadero cuando todas las lineas tienen reserva hija.
- La conversion a reservas debe ser atomica: si una linea falla, no se agenda ninguna.
