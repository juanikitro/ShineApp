---
date: 2026-06-12
title: "Clientes: badge único de reserva y columnas alineadas"
area: frontend/ui
---

# Clientes: badge único de reserva y columnas alineadas

Cleanup visual del listado de clientes para evitar duplicación de estado, mejorar la alineación entre filas y reducir ruido visual.

**Cambios en `frontend/app/components/customers/CustomerListPanel.tsx`:**

- El pill al lado del nombre ahora se muestra solo cuando hay reserva agendada (`Con reserva: DD/MM/YYYY`) y se oculta si no hay reserva (antes mostraba "Sin reserva" en todas las filas → ruido visual). Reemplaza la antigua mezcla "Cumple pronto / Con saldo / Con reserva / Sin proxima visita".
- Se quitó la chip duplicada `Reserva DD/MM/YYYY` y la chip `Sin proxima visita` (ya cubiertas por el badge).
- Se quitó la chip `Ultimo servicio: ...` porque el dato ya aparece en la columna `Ultima visita`.
- La chip de cumple muestra texto nuanced con fecha completa: `Cumple hoy: DD/MM/YYYY`, `Cumple manana: DD/MM/YYYY`, o `Cumple pronto: DD/MM/YYYY` segun `days_until_birthday` (antes era el texto nuanced "Cumple hoy/manana/en N dias" pero con solo `DD/MM`).
- Se quitó la chip `Saldo $X` porque el valor ya está en la columna `Saldo`.
- El bloque `customer-card-meta` solo se renderiza cuando hay al menos una chip.
- Se eliminó el botón flotante de acciones rapidas (icono `MoreHorizontal`) porque los botones `Dashboard`, `Editar` y `Baja` ya estan visibles. Se quitó tambien el prop `onOpenQuickActionsFromTrigger` y su pasamanos desde `frontend/app/page.tsx`. El menu por click derecho (`onContextMenu`) sigue disponible.
- En la columna alterna `Estado` (solo cuando `canViewEconomy=false`), el texto `<small>` ahora muestra un hint (cumpleaños, fecha de próxima reserva o "hace N días" de última visita) en vez de duplicar el `<strong>`. Se introdujo `customerOperationalStateHint` para esto.

**Cambios en `frontend/app/styles/shell.css`:**

- `.customer-record-stat` pasa de `min-width: 110px` a `width: 168px; flex: 0 0 168px; box-sizing: border-box` para que las 4 columnas (`Proxima visita`, `Ultima visita`, `Vehiculos`, `Saldo`) tengan el mismo ancho fijo y queden alineadas entre filas.
- Se eliminaron las reglas CSS de pills/chips que quedaron sin uso: `.customer-pill--birthday`, `.customer-pill--balance`, `.customer-pill--follow-up`, `.customer-chip--info`, `.customer-chip--warning`, `.customer-chip--muted`. Sobrevive solo `.customer-pill--reservation` (badge actual) y `.customer-chip--alert` (chip de cumple).
