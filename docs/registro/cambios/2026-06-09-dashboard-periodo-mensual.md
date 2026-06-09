# Dashboard: periodo mensual por defecto y navegacion entre meses (2026-06-09)

## Contexto

El filtro de periodo del dashboard arrancaba en "principio de mes hasta hoy"
(`from = primer dia del mes`, `to = today`). Ademas, en el header las acciones
quedaban desalineadas: el filtro de periodo (alto, por las labels Desde/Hasta)
vive en su propio `form` con `align-items: end`, mientras que el boton
"Actualizar" cuelga del `record-actions` hermano, centrado verticalmente, asi
que no compartia linea con "Ver periodo".

## Cambio

Frontend, todo en la vista principal:

1. **Default = mes completo.** El estado `period` ahora arranca con
   `monthRange(today)` -> `from = primer dia` y `to = ultimo dia` del mes actual
   (antes `to` era hoy). `monthRange(value, offset = 0)` es un helper nuevo en
   `frontend/lib/page-support.tsx` que reusa `parseIsoDate`/`toIsoDate` y calcula
   el ultimo dia con `new Date(year, month + 1, 0)`, contemplando bisiestos y el
   cruce de anio.
2. **Flechas de mes.** Se agregaron dos botones icono (`ChevronLeft`/
   `ChevronRight`, clase `ghost icon-button`) que flanquean las fechas y llaman a
   `goToMonth(offset)`. Esa funcion calcula `monthRange(period.from, offset)`,
   actualiza el estado y recarga el dashboard al instante. Navegar "ajusta" el
   rango a mes completo (primer-ultimo dia).
3. **Alineacion horizontal.** Nueva regla CSS scopeada
   `.page-actions:has(.dashboard-period-toolbar) { align-items: flex-end; }` en
   `frontend/app/styles/shell.css`, para que "Actualizar" baje a la misma linea
   que "Ver periodo" y las fechas. En mobile el header es columna
   (`.page-actions { display: contents }`), asi que la regla no afecta ese caso.
4. **Fix de cierre obsoleto.** `loadData` acepta ahora un `period` explicito en
   sus opciones (`options.period ?? period`). El reload con debounce de
   `schedulePeriodReload` capturaba el `period` del render anterior (off-by-one:
   cargaba el rango previo al ultimo cambio); ahora pasa el `next` recien
   seteado. `goToMonth` usa el mismo mecanismo para no depender del estado aun no
   committeado.

## Archivos modificados

- `frontend/lib/page-support.tsx` - helper `monthRange` + export.
- `frontend/app/page.tsx` - default `period`, `goToMonth`, `period` explicito en
  `loadData`/`schedulePeriodReload`/`triggerPeriodReloadNow`, flechas en el form.
- `frontend/app/styles/shell.css` - alineacion del header con `:has`.
- `frontend/lib/page-support.test.mjs` - tests de `monthRange`.

## Tests

- `monthRange` cubre: primer/ultimo dia del mes, febrero no bisiesto (28) y
  bisiesto (29), y offset cruzando limites de mes y de anio.
- `npx vitest run lib/page-support.test.mjs` -> 5/5 verde.
- `tsc --noEmit` -> sin errores.

## Limitaciones

- Las flechas no se deshabilitan mientras carga; los requests en vuelo se
  cancelan via `AbortController`, asi que solo aplica el ultimo.
