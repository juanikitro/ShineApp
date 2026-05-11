# Agenda vertical con fecha de egreso

## Decision

La reserva conserva `day` como fecha de ingreso y suma `exit_day` como fecha de egreso opcional. Si `exit_day` esta vacio, la reserva se comporta como una reserva de un solo dia.

## Representacion

La agenda expande visualmente cada reserva dentro del rango `day` a `exit_day`:

- `Ingreso`: dia de entrada del auto.
- `Permanece`: dias intermedios en los que el auto sigue en el local.
- `Egreso`: dia de salida del auto.

El trabajo asociado sigue viniendo desde `Reservation -> WorkOrder`. No se fusionan entidades ni se crean endpoints nuevos.

El tablero usa una columna vertical por dia visible. Por defecto muestra cinco dias, las tarjetas se apilan dentro de cada columna, y las acciones rapidas de crear reserva o cotizacion libre viven en el toolbar para no ocupar una columna de agenda.

Las tarjetas de agenda priorizan hora, cliente y servicios. La patente y la marca no se muestran en la card compacta; si existe, el modelo queda como dato secundario. La deuda se muestra como una fila economica compacta con etiqueta y monto en la misma linea.

Como la agenda se lee por columnas verticales, el cambio de dia o rango se anima horizontalmente como carrusel: durante la transicion conviven los dias actuales y los entrantes en un mismo track. La flecha chica desplaza una columna/dia, la doble flecha desplaza cinco columnas/dias, y el recorrido es continuo, sin pausa intermedia ni reemplazo invisible de dias.

El alto del viewport de agenda se mide desde el tablero renderizado y se anima cuando el rango visible pasa entre dias con distinta cantidad de turnos. Esto evita saltos bruscos al crecer o achicarse el contenido sin fijar una altura unica para todos los dias.

## Limites

Este cambio no modifica capacidad diaria, caja, materiales, herramientas ni reglas de ordenes de trabajo. La capacidad sigue contando por fecha de ingreso para mantener el contrato actual y evitar redisenar cupos en esta iteracion.
