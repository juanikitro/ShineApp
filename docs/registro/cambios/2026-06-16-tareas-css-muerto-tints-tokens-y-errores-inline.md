# Tareas: CSS muerto, tints a tokens y errores inline (2026-06-16)

**Problema:** Cierre de los tres pendientes menores que el pase de #147/#148
dejo anotados como "Decisiones de alcance" en
`docs/registro/cambios/2026-06-13-tareas-accesibilidad-y-primitives.md`.

## Fix aplicado

**tasks.css (CSS muerto)**
- Eliminadas `.tasks-tabs`, `.tasks-tab` y `.tasks-tab--active`: quedaron sin
  uso tras migrar las tabs a `SegmentedControl`. Verificado por grep que no se
  referencian en ningun `.tsx`. No se tocaron otras clases.

**tasks.css (tints de prioridad a tokens)**
- `.task-priority--high`: fondo `rgba(220,38,38,0.12)` ->
  `color-mix(in srgb, var(--color-danger) 12%, transparent)` (match exacto en
  claro; ahora adapta a tema oscuro). `color` queda `var(--color-danger-hover)`.
- `.task-priority--medium`: fondo `rgba(202,138,4,0.12)` ->
  `color-mix(in srgb, var(--color-warning) 12%, transparent)`; `color: #a16207`
  -> `var(--status-pending-text)`.
- `.task-priority--low`: fondo `rgba(34,197,94,0.12)` ->
  `color-mix(in srgb, var(--color-success) 12%, transparent)`; `color: #15803d`
  -> `var(--status-success-text)` (match exacto en claro).
- `.task-meta-chip--danger`: fondo `rgba(220,38,38,0.1)` ->
  `color-mix(in srgb, var(--color-danger) 10%, transparent)`.
- Convencion alineada con `.task-meta-chip--user`/`--customer` (color de chip via
  tokens `--status-*-text`) y con el patron `color-mix` ya usado en shell.css.

**TaskForm.tsx + TasksPanel.tsx + page.tsx (errores inline)**
- Los errores de campo del backend (DRF) ahora se muestran inline bajo cada
  input del `TaskForm`, ademas del toast global. El mapa `formFieldErrors` de
  `page.tsx` (que `setError` llena desde `notice.fields`) se pasa
  `page.tsx -> TasksPanel -> TaskForm`.
- En `TaskForm` cada `<Field>` recibe `error={fieldErrors?.['<campo>']}`
  (title, description, due_date, priority, recurrence). El titulo combina el
  error client-side con el del server: `titleError ?? fieldErrors?.['title']`.
- Para no mostrar errores viejos al abrir el modal, `page.tsx` limpia
  `formFieldErrors` via callback `onFormOpen={() => setError(null)}`, que
  `TasksPanel` invoca al abrir create/edit. El submit ya limpia via
  `setError(null)` en `runAction`. No se cambio el payload de `onSubmit` ni la
  logica de cierre-en-exito.

## Decisiones de alcance

- Los campos `assignee`/`customer`/`vehiculo` usan `SearchSelect` (sin slot de
  `error`), igual que en todos los forms peer (ReservationForm, ServiceForm,
  etc.): sus errores de server siguen solo via toast. No se modifico el
  primitivo compartido para mantener el cambio chico y alineado al patron.
- Tint de `.task-priority--medium`: el texto `#a16207` (yellow-700) se mapeo al
  vecino mas cercano `--status-pending-text` (#b45309, amber-700). Es un cambio
  de tono minimo a opacidad plena, pero ademas vuelve el texto adaptable al tema
  oscuro (antes era hex fijo ilegible sobre fondo oscuro). Los fondos son tints
  de baja opacidad (10-12%), con cambio imperceptible.
- Se dejaron sin tokenizar los one-off fuera de alcance (puntos de prioridad,
  chips `--info`/`--customer`/`--vehicle`, contadores de bucket): no estaban
  marcados y/o no tienen token cercano sin cambiar el tono visiblemente.

## Tests

- `tsc --noEmit`: limpio. `npm run test`: verde. `npm run build`: OK.
