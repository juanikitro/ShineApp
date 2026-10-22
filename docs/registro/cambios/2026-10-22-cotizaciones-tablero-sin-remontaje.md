# Cotizaciones sin remontaje del tablero al actualizar

## Cambio visible

Al guardar, enviar, mover o refrescar una cotizacion, las columnas y tarjetas
del tablero ya no reproducen su animacion de entrada (fundido desde opacidad 0),
que se percibia como un pestañeo de todo el tablero.

## Causa

`QuoteDroppableLane` y `QuoteDraggableRecord` estaban declarados dentro de
`QuotesPanel`. Cada render del panel creaba un tipo de componente nuevo, React
remontaba columnas y tarjetas, y la regla `.records:not([data-motion]) > *`
volvia a ejecutar `record-fade-in`. Complementa el ajuste previo que solo
suprimio el overlay `motion-flash`.

## Alcance

- Los componentes se declaran a nivel de modulo; el marcado, las clases, las
  acciones, el arrastre y las claves por `id` no cambian.
- La animacion de entrada se mantiene al montar el tablero o al aparecer una
  cotizacion nueva o que cambia de columna.

## Validacion

- Test de regresion: tras un re-render con datos recargados, la columna y la
  tarjeta conservan el mismo nodo DOM.
