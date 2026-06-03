# Fix: card de reserva en agenda recorta el ultimo renglon a la mitad

## Contexto

En las vistas apiladas de la agenda (lista de trabajo y tablero por estado), la
card de reserva mostraba el ultimo renglon de la cabecera (modelo de vehiculo o
nombre de servicio) cortado a la mitad: solo se veian las puntas superiores de
los glifos. Se dispara cuando el titulo (`hora - cliente`) envuelve a dos lineas,
empujando el contenido por encima de la altura de la card.

## Causa raiz

La regla base `.workspace .record.agenda-operational-card` fijaba
`height` / `min-height` / `max-height` a `--agenda-instance-card-height` (268px)
con `overflow: hidden`. Esa altura fija solo es necesaria en el board temporal
(`--spanning`), donde las cards se posicionan por franja horaria y deben tener
altura uniforme.

En las vistas apiladas la card hereda esa altura fija, la cabecera
(`.agenda-entry-head { overflow: hidden }`, en la fila `minmax(0, 1fr)`) queda
comprimida y recorta el contenido a mitad de renglon. Medido en reproduccion
aislada: con altura fija la cabecera desbordaba 52px, el modelo de vehiculo
quedaba oculto por completo y el nombre de servicio cortado.

## Cambios

- `frontend/app/styles/agenda.css`: removido `height` / `max-height` /
  `min-height` de la regla base `.workspace .record.agenda-operational-card`.
  La altura fija queda solo en `.workspace .record.agenda-operational-card--spanning`
  (board), que ya la declaraba. Las cards apiladas (lista de trabajo, tablero por
  estado) ahora crecen con su contenido y no recortan texto.
- Horario movido al lado del badge de estado: el titulo de la card pasa a ser
  solo el nombre del cliente (antes `hora - cliente`) y el horario (`10:00` /
  `Sin hora`) se muestra en el kicker, alineado a la derecha del badge. Esto
  ademas acorta el titulo y reduce la altura de la cabecera. Nuevo prop opcional
  `timeLabel` en `AgendaReservationCard` y nueva clase `.agenda-entry-time`.

## Archivos modificados

- `frontend/app/styles/agenda.css`
- `frontend/app/components/agenda/AgendaReservationCard.tsx`
- `frontend/app/page.tsx`

## Validacion

- Visual: reproduccion aislada del card en navegador con mediciones before/after.
  BEFORE: altura 268px, cabecera desborda 52px, servicio cortado y modelo oculto.
  AFTER (vistas apiladas, nombre largo): altura segun contenido, cabecera sin
  desborde, servicio y modelo completos, horario a la derecha del badge. El board
  (`--spanning`) conserva la altura fija 268/284px (truncado por diseno en esa vista).
- `tsc --noEmit`: sin errores. `vitest run`: 278 tests pasan (31 archivos).

## Nota de reaplicacion (2026-06-03)

El fix de altura entro a `development` con el PR #38, pero el cambio del horario
junto al badge fue sobrescrito por un merge concurrente (otra branch `claude/*`
que tocaba los mismos archivos). Se reaplico el horario sobre el `development`
actual preservando el trabajo concurrente de `page.tsx`.
