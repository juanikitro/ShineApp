# Agenda: columnas borderless y alta rapida desde el header

## Cambio

La grilla semanal de Agenda deja de renderizar un bloque inferior por dia para `Sin reservas` o `Agregar turno`.

- La creacion rapida pasa a un boton `+` junto al nombre del dia.
- Las columnas dejan de verse como tarjetas con borde y pasan a comportarse como un lienzo comun.
- La altura del tablero se estabiliza con una fila flexible vacia, de modo que el header y las tarjetas no cambian de posicion al navegar entre semanas con distinta densidad.
- Los headers diarios pasan a verse como chips blancos flotantes, separados del fondo de la agenda.

## Alcance

- No cambia endpoints, payloads ni logica de reservas.
- El `+` abre el mismo popup rapido de reserva con el dia precompletado.
- Se mantiene el drag and drop y el spanning de reservas multidia.

## Validacion esperada

- Al pasar entre semanas como `11/5 -> 12/5 -> 14/5` no debe variar la posicion vertical del CTA porque ya no existe un footer por columna.
- Una semana sin reservas debe conservar altura consistente y mostrar solo el header de cada dia con su `+`.
