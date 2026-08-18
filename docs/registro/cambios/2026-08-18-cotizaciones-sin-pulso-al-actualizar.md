# Cotizaciones sin pulso al actualizar

## Cambio visible

Al guardar, enviar o refrescar una cotizacion, la tarjeta del tablero ya no
reproduce el pulso visual de confirmacion que se percibia como un pestañeo.

## Alcance

- El refresco de datos, los estados de cotizacion, las acciones y el arrastre
  entre columnas se conservan.
- Los demas registros de la aplicacion mantienen su feedback visual actual.
- La confirmacion de la accion sigue disponible mediante el toast de exito.

## Validacion

- El tablero de Cotizaciones no renderiza el overlay de pulso para una tarjeta
  marcada como actualizada.
