# Agenda: tarjetas de reserva compactas

**Estado:** diseno aprobado el 2026-07-30.

## Objetivo

Mostrar mas reservas en la agenda semanal de escritorio sin ocultar datos ni
acciones operativas.

## Decision

Las tarjetas de la agenda semanal reducen su altura fija de 232 px a 184 px en
el layout base de escritorio. En viewports de escritorio mas bajos se usan 176
px y 168 px. El pie conserva la deuda y las acciones visibles; no se mueve
ninguna accion al menu de acciones rapidas.

La jerarquia permanece: estado y hora, cliente, servicio, vehiculo y pie
operativo. Solo se compactan los espacios internos, el borde del servicio y la
altura de la franja. Movil conserva su altura especifica actual.

## Fuera de alcance

- Cambios de datos, permisos, endpoints o estados de la reserva.
- Ocultar o trasladar `Iniciar`, `Entregar`, `Cobrar` o eliminar.
- Cambiar el orden de teclado, los labels accesibles o el foco visible.

## Validacion

- El test focalizado del renderer confirma que titulo, servicio, vehiculo,
  estado, deuda y acciones siguen presentes.
- La inspeccion visual de escritorio debe confirmar que no se corta texto ni
  acciones y que el tablero muestra una reserva adicional cuando hay altura
  disponible.
