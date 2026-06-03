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

## Archivos modificados

- `frontend/app/styles/agenda.css`

## Validacion

- Visual: reproduccion aislada del card en navegador con mediciones before/after.
  BEFORE: altura 268px, cabecera desborda 52px, servicio cortado y modelo oculto.
  AFTER: altura 320px (segun contenido), cabecera sin desborde, servicio y modelo
  completos. El board (`--spanning`) conserva la altura fija 268/284px.
- Sin tests que referencien `.agenda-operational-card` ni `.agenda-entry-head`.
- Build/Vitest pendientes: worktree fresco requiere `npm install` previo.
