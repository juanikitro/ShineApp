# Agenda vertical con fecha de egreso

## Decision

Reserva mantiene `day` como fecha de ingreso y agrega `exit_day` opcional como egreso. Si `exit_day` esta vacio, funciona como reserva de un solo dia.

## Representacion

Agenda expande cada reserva del rango `day` a `exit_day`:

- `Ingreso`: dia de entrada del auto.
- `Permanece`: dias intermedios; auto sigue en local.
- `Egreso`: dia de salida del auto.

Trabajo asociado sigue desde `Reservation -> WorkOrder`. No se fusionan entidades ni se crean endpoints nuevos.

Tablero: una columna vertical por dia visible. Default cinco dias. Cards apiladas por columna. Acciones rapidas crear reserva o cotizacion libre viven en toolbar para no ocupar columna de agenda.

Cards priorizan hora, cliente y servicios. Patente y marca no se muestran en card compacta; modelo, si existe, queda como secundario. Deuda aparece como fila economica compacta con etiqueta y monto en misma linea.

Agenda se lee por columnas verticales; cambio de dia o rango anima horizontal como carrusel. Durante transicion conviven dias actuales y entrantes en mismo track. Flecha chica mueve una columna/dia; doble flecha mueve cinco columnas/dias, y recorrido continuo, sin pausa intermedia ni reemplazo invisible de dias.

Alto del viewport de agenda se mide desde tablero renderizado y se anima cuando rango visible cambia entre dias con distinta cantidad de turnos. Evita saltos bruscos al crecer o achicarse contenido sin fijar altura unica para todos los dias.

## Limites

Este cambio no modifica capacidad diaria, caja, materiales, herramientas ni reglas de ordenes de trabajo. Capacidad sigue contando por fecha de ingreso para mantener contrato actual y evitar redisenar cupos en esta iteracion.
