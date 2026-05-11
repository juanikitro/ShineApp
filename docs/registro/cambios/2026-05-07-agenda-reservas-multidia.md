# Agenda: reservas multidia como una sola tarjeta

## Contexto

La agenda ya maneja reservas con fecha de ingreso (`day`) y fecha de egreso (`exit_day`). Antes, el frontend mostraba una tarjeta por cada dia ocupado, lo que duplicaba visualmente la misma reserva.

## Cambio

La grilla semanal mantiene las columnas por dia y los conteos diarios, pero renderiza cada reserva una sola vez. Si la reserva cruza varios dias visibles, la tarjeta ocupa las columnas correspondientes con `grid-column / span`.

## Alcance

- No cambia el contrato de API ni el modelo de datos.
- No cambia la validacion de ingreso/egreso.
- El drag de agenda sigue moviendo la reserva completa desde su dia de ingreso.
- Si una reserva empieza antes o termina despues de la ventana visible, se muestra solo el tramo visible.

## Validacion esperada

Una reserva del 7/5 al 9/5 debe verse como una sola tarjeta ocupando tres columnas, no como tres tarjetas repetidas.
