# UI/UX: pasada de consistencia, a11y y estados (2026-06-12)

**Problema:** Una auditoria UI/UX completa del frontend encontro inconsistencias
y huecos transversales: tokens referenciados pero no definidos, estados de
carga/error/vacio no uniformes entre secciones, errores de validacion que solo
iban al toast global, botones crudos que esquivaban el primitive `Button`,
formularios con doble-submit posible, falta de error boundary, targets tactiles
chicos en mobile y teclados mobile sin optimizar.

## Fix aplicado (por bloque)

**Tokens y base (`frontend/app/styles/tokens.css`, `base.css`, `shell.css`)**
- Se define `--color-link` / `--color-link-hover` (estaban referenciados en
  `shell.css` pero sin declarar, dejando muerto el focus ring de
  `.cash-entry-row` y tres colores de link).
- `--color-text-muted` pasa de `#94A3B8` (~2.6:1 sobre blanco, falla AA) a
  `#64748B`.
- Nuevo token `--shadow-raise` (la sombra `0 10px 24px` se repetia ~10 veces a
  mano); se resuelve `--radius-2` indefinido a `--radius-md`.
- `a:focus-visible` global y bloque `@media (max-width:620px)` que sube botones,
  icon-buttons, combos, `mode-toggle` y `quick-actions` a 44px.
- Grids de dashboards (`customer-dashboard-metrics` 6col, `supplier-dashboard-profile`
  6col, `service-dashboard-profile` 5col) colapsan a 2 columnas en <=620px.

**Primitive `Button` (`frontend/app/components/ui/Button.tsx`)**
- Variantes muertas `destructive` y `subtle` (sin CSS) se eliminan; la variante
  destructiva real es `danger` (clase `.danger` ya existente). `ConfirmDialog`
  con `tone='danger'` ahora queda realmente estilado.

**Estados async (`frontend/app/page.tsx`, `InventoryPanel.tsx`)**
- Helper `sectionFallback` (SkeletonList + ErrorState con reintento via
  `loadData({force:true})`) aplicado a tools, tasks, quotes, services, work-status
  y work-fecha de ingreso, que antes aparecian "pop-in" sin loader ni error.
  Inventory suma rama de error (ya tenia skeleton).
- `InventoryPanel`: estados vacios para sublistas de proveedores, unidades
  abiertas y compras.

**Validacion inline (`Field.tsx`, `page.tsx`, 13 forms)**
- `Field` acepta `error` y lo muestra inline bajo el input (`.field--error` con
  borde rojo, span `role=alert`). `setError` mapea `notice.fields` a
  `formFieldErrors` y se limpia al abrir modal / iniciar submit. El toast deja de
  truncar a 3 (ahora 8).
- 13 formularios pasan `fieldErrors` por campo.

**Botones a `Button` + doble-submit**
- ~115 botones `<button className="primary|ghost|danger">` migrados a
  `<Button variant=...>` en paneles, settings, forms y `page.tsx`, conservando
  clases utilitarias y atributos. Se dejaron crudos los botones con CSS propio
  (nav, segmented, combo-options, quick-actions, record-rows, tabs, theme-switch).
- Fix doble-submit: ServiceForm, DebtPaymentForm y ProfileModal usan
  `<Button type='submit' loading={submitting}>`; sus handlers reciben key
  `save:*` (o `pendingActions` para profile).
- **Importante:** el save compartido de los modales de detalle
  (`renderDetailEditActions`) requiere `type='submit'` explicito porque `Button`
  default es `type='button'` (un `<button>` sin type dentro de `<form>` es submit
  implicito; sin el fix el boton "Editar" quedaba inerte).

**Flujos / a11y / mobile**
- Nuevos `frontend/app/error.tsx` y `frontend/app/global-error.tsx` (no habia
  error boundary para el client component de ~14k lineas).
- `QuickActionsMenu`: el item en estado "confirmar" mantiene `role='menuitem'`
  (antes pasaba a `undefined` y quedaba huerfano de la navegacion por teclado).
- `window.confirm` reemplazado por el `ConfirmDialog` tematico
  (`useConfirmDialog`) en TasksPanel y TrashSettingsPanel.
- Teclados mobile: `type=tel` / `inputMode=tel` / `autoComplete` en telefono y
  `autoComplete=email` en SupplierForm y en el detalle de cliente.

**Docs**
- `docs/design-system.md` sincronizado con `tokens.css`: primario real `#0F62FE`
  (no `#0284C7`), danger `#DC2626`, muted `#64748B`, y la escala real de radios
  (xs/sm/md/lg/xl) en vez de "todo 2px".

## Decisiones de alcance (no-ops deliberados)

- Dashboards de Servicio/Proveedor: el `info-note` por `!hasDashboardHistory`
  es ambiguo (vacio vs error) y no hay flag de error dedicado; no se convierte a
  ErrorState para no inventar un estado de error inexistente.
- Agenda: la lane por dia es un drop-zone posicionado sobre una grilla de tiempo
  (las cards se superponen, no son hijas); el header ya muestra el conteo, asi
  que no se inyecta "Sin reservas" para no romper el layout de la grilla.
- Espaciados/tipografias genuinamente fuera de escala (10px, 18px...) no se
  "snapean" a la escala para no mover layouts; solo se rutean a token los valores
  que ya coincidian con uno.

## Follow-ups pendientes

- Aviso "sesion expirada" en login cuando `/auth/me/` falla con token guardado
  (requiere plumbing de prop hacia `LoginScreen`).
- Teclados mobile en el detalle-edicion de proveedor (segunda superficie).
- Migracion del resto de hex/sombras/duraciones crudos en CSS a tokens
  (los exactos a token ya se cubren; los off-scale quedan documentados).

## Tests

- `npx tsc --noEmit`: limpio.
- `npm run test` (vitest): 430 tests, 50 archivos, todo en verde. Se actualizo
  `QuickActionsMenu.test.ts` para consultar el item de confirmacion por
  `role='menuitem'` (acompana el fix de a11y).
- `npm run build` (next build): compila, type-check y genera las 8 rutas OK.

## Compatibilidad

- Sin cambios de contrato backend ni de payloads. La captura de errores reusa el
  `ApiErrorNotice` existente (`notice.fields`).
- El look se mantiene (tokens del codigo intactos salvo muted mas oscuro por AA);
  los botones migrados renderizan con las mismas clases.
