# Reserva y cotizacion unificadas desde agenda

## Contexto

El flujo de agenda tenia dos acciones separadas: crear reserva y crear cotizacion libre. Eso obligaba al operador a decidir antes de cargar datos que en la practica comparten cliente, vehiculo y servicios.

## Cambio

- Se elimina la accion separada de cotizacion libre en la agenda.
- La accion `Crear reserva` abre el formulario sin fecha ni hora precargadas.
- Si el formulario se guarda sin fecha ni hora, se crea una cotizacion libre.
- Al crear una cotizacion libre se navega a `Cotizaciones` y se abre el detalle de la cotizacion creada.
- El detalle de cotizacion muestra cliente, vehiculo, servicios, notas, total y accion para bajar PDF.
- Si el formulario se guarda con fecha, se crea una reserva y automaticamente una cotizacion vinculada; la vista queda en agenda.

## Decision

La fecha define el tipo de operacion:

- sin fecha ni hora: venta/cotizacion libre;
- con fecha: reserva operativa con cotizacion asociada.

Se mantiene el contrato backend existente: reservas se crean por `/reservations/`, cotizaciones libres por `/quotes/` y la cotizacion de una reserva por `/reservations/{id}/quote/`.
