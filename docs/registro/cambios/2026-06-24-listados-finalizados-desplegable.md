# items finalizados en desplegable al final de listados

- fecha: 2026-06-24
- tipo: ui
- area: frontend

## que cambia

- agrega `CollapsibleSection` (ui primitive con `<details>` accesible) para agrupar items finalizados/archivados al final de una lista
- DebtPanel: las deudas saldadas (`balance_due <= 0`) salen de la lista principal y quedan en un desplegable "Deudas saldadas"
- ServicesPanel: los servicios inactivos (`is_active === false`) quedan en un desplegable "Servicios inactivos"
- InventoryPanel: las unidades finalizadas (`status !== 'open'`) quedan en un desplegable "Unidades finalizadas"
- page.tsx (notificaciones): se unifican pendientes y gestionadas en un solo panel; las solicitudes gestionadas/archivadas quedan en un desplegable "Gestionadas"

## criterio

- el desplegable arranca cerrado salvo que no haya items activos arriba (`defaultOpen`)
- muestra un `count` con la cantidad de items agrupados
- la card de cada item se reusa identica entre la lista activa y el desplegable (sin duplicar markup)
- estilos compartidos en `shell.css` (`.collapsible-section`), con tokens semanticos y foco visible

## impacto visible

- las listas largas muestran primero lo accionable (con saldo, activo, abierto, pendiente)
- lo terminado queda accesible pero no satura la vista
- sin cambios de contrato API ni de logica de negocio; solo agrupacion visual

## validacion esperada

- `tsc --noEmit` sin errores
- `vitest run`: 483 tests OK
- `vitest run --coverage`: branches 81.59% (gate >= 80% OK)
- el desplegable abre/cierra y respeta `defaultOpen` cuando la lista activa esta vacia
