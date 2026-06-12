---
date: 2026-06-12
title: "Clientes: badge único de reserva y columnas alineadas"
area: frontend/ui
---

# Clientes: badge único de reserva y columnas alineadas

Cleanup visual del listado de clientes para evitar duplicación de estado y mejorar la alineación entre filas.

**Cambios en `frontend/app/components/customers/CustomerListPanel.tsx`:**

- El pill al lado del nombre ahora siempre indica estado de reserva: `Con reserva: DD/MM/YYYY` (con fecha) o `Sin reserva` (en lugar de la antigua mezcla "Cumple pronto / Con saldo / Con reserva / Sin proxima visita"). La fecha se incluye dentro del propio badge para evitar que se repita abajo.
- Se quitó la chip duplicada `Reserva DD/MM/YYYY` y la chip `Sin proxima visita` (ya cubiertas por el badge).
- Se quitó la chip `Ultimo servicio: ...` porque el dato ya aparece en la columna `Ultima visita`.
- Las chips de cumple y saldo se mantienen como complementos cuando aplican.
- El bloque `customer-card-meta` solo se renderiza cuando hay al menos una chip.
- Se eliminó el botón flotante de acciones rapidas (icono `MoreHorizontal`) porque los botones `Dashboard`, `Editar` y `Baja` ya estan visibles. Se quitó tambien el prop `onOpenQuickActionsFromTrigger` y su pasamanos desde `frontend/app/page.tsx`. El menu por click derecho (`onContextMenu`) sigue disponible.

**Cambios en `frontend/app/styles/shell.css`:**

- `.customer-record-stat` pasa de `min-width: 110px` a `width: 168px; flex: 0 0 168px; box-sizing: border-box` para que las 4 columnas (`Proxima visita`, `Ultima visita`, `Vehiculos`, `Saldo`) tengan el mismo ancho fijo y queden alineadas entre filas.
