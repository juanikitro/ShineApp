# Creacion rapida en cotizaciones y reservas grupales

Fecha: 2026-07-24

## Cambio

- La creacion rapida de vehiculos y servicios reconoce los destinos de lineas
  grupales de cotizaciones y reservas, incluida la edicion de una cotizacion
  grupal.
- El registro creado se incorpora a la lista local antes de aplicarlo a la
  linea. Asi la seleccion y el recargo de precio por tipo de vehiculo usan el
  dato nuevo sin esperar otra carga.
- Las recargas forzadas de datos omiten la deduplicacion de GET en curso para
  no reutilizar una respuesta anterior despues de crear un registro.

## Alcance

- No cambia los endpoints ni los payloads de cotizaciones, reservas, vehiculos
  o servicios.
- La cotizacion o reserva individual conserva su flujo de creacion rapida.

## Validacion

- Tests focalizados de seleccion de formularios de cotizacion/reserva y del
  cliente API cubren los destinos grupales y la recarga forzada.
