# Detalle read-first al clickear items de listados

## Contexto

Al clickear un item de un listado, el detalle no se mostraba como una vista de
lectura. Para las entidades editables (movimiento de caja, deuda, cotizacion,
vehiculo, material, herramienta, reserva, orden de trabajo, etc.) el `DetailModal`
abria directamente el **formulario de edicion**, sin presentar el registro: por
ejemplo, al clickear un ingreso de la caja se veian campos de edicion (Tipo,
Categoria, Importe, Fecha) pero no la contraparte, el metodo de pago, la
referencia, el origen ni quien lo registro. Para las entidades no editables
(movimiento de stock, unidad abierta) el modal mostraba un volcado crudo de las
claves tecnicas del objeto (`source_kind`, `signed_amount`, etc.). Ademas, el
listado de "Movimientos de stock" del inventario no era clickeable.

## Cambio

El `DetailModal` ahora es **read-first**: al clickear un item se muestra primero
un detalle legible, con un boton **Editar** que abre el formulario existente
(para los kinds editables). Los botones "Editar" explicitos (dashboard de
cliente, lista de clientes, dashboard de proveedor, lista de vehiculos) siguen
abriendo directo en edicion via la opcion `startEditing`.

- **Detalle curado de caja** (`CashEntryDetail`): hero con direccion (↑ ingreso /
  ↓ egreso) y monto firmado en color, mas filas legibles de clasificacion,
  contraparte (Cliente/Proveedor/Acreedor), fecha, metodo de pago, referencia,
  origen, detalle y quien lo registro. Reutiliza los helpers de `lib/cash-entry`.
- **Formateador generico** (`lib/detail-format.ts`): convierte cualquier registro
  plano en una lista de campos legibles con etiquetas en español, formatea montos
  (`money`), fechas (`formatDateLabel`/`formatDateTimeLabel`) y booleanos
  (Si/No), y oculta ruido tecnico (ids, claves foraneas crudas como
  `customer`/`supplier`/`debt`, banderas internas y valores vacios). Esto mejora
  de un solo cambio el detalle de ~20 listados que usan el modal generico.
- **`DetailModal` read-first**: nuevo render de lectura (detalle curado de caja o
  grilla formateada) con boton "Editar" para kinds editables; sigue mostrando el
  `editForm` cuando `editing` es true.
- **`openDetailModal` por defecto en lectura**: `editing` arranca en `false`;
  nueva opcion `startEditing` para los botones de edicion explicita; nueva
  funcion `startDetailEditing` que el modal usa para pasar de ver a editar.
- **Movimientos de stock clickeables**: las filas del listado de movimientos de
  stock del inventario ahora abren su detalle (`detailRecordProps`).

## Archivos modificados

- `frontend/lib/detail-format.ts` — nuevo: etiquetas ES, formato de valores y
  ocultamiento de ruido (`detailFieldLabel`, `formatDetailValue`,
  `isHiddenDetailField`, `buildDetailFields`)
- `frontend/app/components/cash/CashEntryDetail.tsx` — nuevo: detalle legible del
  movimiento de caja
- `frontend/app/components/ui/DetailModal.tsx` — read-first con detalle curado /
  grilla formateada y boton "Editar"; nuevas props `kind`, `editable`, `onEdit`
- `frontend/app/components/ui/ui.test.tsx` — test del `DetailModal` ajustado al
  nuevo formateo (oculta vacios, objetos sin nombre -> "Ver mas")
- `frontend/app/components/inventory/InventoryPanel.tsx` — filas de movimientos de
  stock clickeables
- `frontend/app/page.tsx` — `openDetailModal` con `startEditing`,
  `startDetailEditing`, props nuevas al `<DetailModal>`; 4 botones "Editar"
  abren con `startEditing: true`
- `frontend/app/styles/shell.css` — estilos `.detail-view`, `.cash-detail` y
  modificadores (hero, monto, chip)

## Pendiente (Fase 4, requiere backend)

Las entidades grandes que hoy solo tienen modal (vehiculo, cotizacion, orden de
trabajo) podrian tener un **dashboard** propio como cliente/servicio/proveedor,
pero eso requiere un endpoint `/{entidad}/{id}/history/` nuevo en el backend. Se
deja fuera de este cambio (100% frontend) para decidir aparte.

## Validacion

- `frontend` `npx tsc --noEmit`: OK
- `frontend` `next build`: OK (page principal 295 kB / 417 kB First Load)
- `frontend` vitest `ui.test.tsx`: 23 passed
- `frontend` prettier sobre archivos nuevos: OK
- eslint no pudo correr en el worktree (node_modules principal sin
  `@eslint/eslintrc`); queda cubierto por CI
