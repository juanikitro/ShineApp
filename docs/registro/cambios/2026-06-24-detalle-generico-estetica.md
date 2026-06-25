# Detalle generico de instancias con estetica de la app

## Contexto

El modal de detalle generico (`DetailModal` -> `buildDetailFields`) renderizaba
una tabla cruda `dt`/`dd` que se veia como el admin por defecto de Django: sin
iconos, con etiquetas filtradas a medias (quedaban en ingles: "Vehicle Label",
"Service Icon", "Day", "Exit Day", "Material Overrides"), el estado en crudo
("confirmed") y ruido visual como el emoji decorativo del servicio o
pluralizaciones torpes ("1 items"). Afecta a ~20 listados que usan el modal
generico (reserva, orden de trabajo, vehiculo, material, herramienta, etc.).

## Cambio

100% frontend, sin tocar contratos ni backend.

- **`lib/detail-format.ts`**:
  - Mas etiquetas ES (`vehicle_label`->Vehiculo, `day`->Dia, `exit_day`->Salida,
    `items`, `material_overrides`->Materiales personalizados, `public_code`,
    `valid_until`, `sent_at`, `reservation_day`, `start_time`, `entry_day`).
  - `service_icon` y `status_label` ahora se ocultan del detalle (decorativo /
    redundante).
  - Pluralizacion correcta de arrays: "1 item" vs "N items".
  - Nuevo `detailStatusLabel(value)`: traduce estados comunes (pending,
    confirmed, in_progress, ready, delivered, paid, overdue, in_use, etc.) y cae
    al valor crudo si no lo conoce.
  - `buildDetailFields` expone el `status` crudo y prefiere `data.status_label`
    del backend cuando viene.
- **`app/components/ui/DetailModal.tsx`**: el detalle de lectura ahora se arma
  con tarjetas `.detail-field` (icono + etiqueta + valor) en vez de la tabla
  plana. Mapa `detailFieldIcons` (lucide) por clave, fallback `Info`. El estado
  se pinta como chip reutilizando las clases `.status.<estado>` ya existentes.
- **`app/styles/shell.css`**: nuevas reglas `.detail-fields` / `.detail-field`
  con badge de icono tintado (`color-mix` sobre `--color-primary`, valido en
  claro y oscuro). No se tocan `.detail-grid` / `.detail-row` (los siguen usando
  `CashEntryDetail` y los profile-grids).

## Archivos modificados

- `frontend/lib/detail-format.ts`
- `frontend/app/components/ui/DetailModal.tsx`
- `frontend/app/styles/shell.css`
- `frontend/lib/detail-format.test.mjs` — tests de status, ocultos y plural
- `frontend/app/components/ui/ui.test.tsx` — chip de estado y "1 item"

## Validacion

- `frontend` vitest `detail-format.test.mjs` + `ui.test.tsx`: 38 passed
- `frontend` `tsc --noEmit`: OK
- `frontend` `npm run test:coverage`: gate OK (branches global 81.54% >= 80%,
  `detail-format.ts` 98.38% branches)
