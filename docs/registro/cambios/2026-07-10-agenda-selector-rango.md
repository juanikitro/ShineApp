# Agenda: selector semana/mes junto al switch de vista

Fecha: 2026-07-10

## Cambio

- El selector `Semana / Mes` de la agenda se mueve al strip superior de la seccion, alineado horizontalmente a la izquierda del switch `Agenda / Estado / Fecha de ingreso`.
- El selector de rango solo se muestra cuando la vista activa es `Agenda`; las vistas `Estado` y `Fecha de ingreso` conservan su layout previo.
- Se elimina la fila separada del selector dentro del panel de agenda para reducir salto visual y dejar los controles de vista agrupados.

## Validacion

- `npm exec vitest -- run app/components/agenda/AgendaBoardToolbar.test.tsx app/components/ui/ui.test.tsx`
- `git diff --check -- frontend/app/page.tsx frontend/app/styles/agenda.css`
