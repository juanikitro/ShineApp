# Tareas: accesibilidad, primitives y mobile (2026-06-13)

**Problema:** Pase de auditoria dirigido al modulo de Tareas (que entro con
#147 y no habia pasado por el lente del audit). Hallazgos:

- Eliminar tarea era un solo click sin confirmacion (el `ConfirmDialog` que
  habia puesto en #148 se perdio en el rewrite de #147).
- `TaskForm` no usaba `Field`/`SearchSelect`/`Button`; selects nativos sin
  busqueda para cliente/vehiculo/asignado.
- El modal de tarea se cerraba aun cuando el submit fallaba (perdia lo tipeado).
- Tabs reimplementadas a mano en vez de `SegmentedControl`; popovers inline sin
  navegacion por teclado.
- `tasks.css` sin `@media` (touch targets chicos: el toggle de completar media
  24px) y un `rgba` crudo.

## Fix aplicado

**TasksPanel** (`TasksPanel.tsx`)
- Eliminar tarea usa `useConfirmDialog` (`requestConfirm` tone danger) +
  `<ConfirmDialog/>`. El undo del handler en `page.tsx` se conserva.
- Tabs (empleador y empleado) migradas a `SegmentedControl selectionMode="tabs"`
  (gana navegacion por flechas + estilo consistente).
- Popovers inline (prioridad/asignado/vencimiento) con navegacion por teclado
  (Arrow/Home/End) via `handlePopoverKeyDown`; Escape ya cerraba.
- Iconos de accion (editar/eliminar/completar) 14->16.
- El modal cierra **solo si el submit tuvo exito**: `onCreate`/`onUpdate`
  devuelven el resultado de `runAction` (truthy en exito) y
  `handleSubmitCreate/Edit` cierran con `if (ok)`.

**TaskForm** (`TaskForm.tsx`)
- Inputs envueltos en `Field`; el error de titulo obligatorio se muestra inline
  en el `Field` del titulo (antes era un `<p>` al fondo).
- Cliente/Vehiculo/Asignar a pasan de `<select>` nativo a `SearchSelect`
  (buscable), preservando el filtrado vehiculo-por-cliente y las opciones
  vacias.
- Submit/Cancelar usan `Button` (`loading` en submit). Payload de `onSubmit`
  intacto.

**page.tsx**: `onCreate`/`onUpdate` de tareas hacen `return await runAction(...)`
para habilitar el cierre condicional del modal.

**tasks.css**
- `@media (max-width: 620px)`: apila la fila de filtros, sube `task-check` a 44px
  (min-width/height), `button.task-meta-chip` a 36px, y acota `.task-popover` a
  `calc(100vw - 32px)`.
- `task-meta-chip--user`: `rgba(37,99,235,0.1)` ->
  `color-mix(in srgb, var(--color-primary) 10%, transparent)`.

## Decisiones de alcance

- Errores de server del `TaskForm` siguen via toast global (que ya lista campos):
  evita plumbing del mapa `formFieldErrors` a traves de `TasksPanel`; el fix de
  "no cerrar en error" + el toast cubren el caso (no se pierde lo tipeado).
- Los tints de prioridad one-off de `tasks.css` (amber/green sin token exacto) se
  dejan: tokenizarlos cambiaria el color. Solo se migro el `rgba` flagged.
- Las clases `.tasks-tabs`/`.tasks-tab` quedan como CSS muerto tras migrar a
  `SegmentedControl`; se pueden limpiar aparte.

## Tests

- `tsc --noEmit`: limpio. `npm run test`: 430 en verde. `npm run build`: OK.
