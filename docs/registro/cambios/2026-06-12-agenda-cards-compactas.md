---
date: 2026-06-12
title: "Agenda: cards de reservas más compactas"
area: frontend/ui
---

# Agenda: cards de reservas más compactas

Rediseño visual de las cards de reservas en la agenda operativa para mayor densidad de información y uso eficiente del espacio.

**Cambios en `frontend/app/styles/agenda.css`:**

- Card padding y gap reducidos (10px → 8px)
- Gap interno del contenido reducido (6px → 4px en kicker y copy)
- Badge de fase con menor padding (3×7 → 2×6)
- Nombre del cliente acotado a `--text-md` y a 1 línea con ellipsis
- Nombre de servicio ligeramente reducido (`--text-md` → `--text-base`, weight 800 → 750)
- Gap de acciones reducido (6px → 4px)
- Panel de deuda transformado: eliminado el borde bordeado con fondo diferenciado; reemplazado por una fila inline separada solo por `border-top`, con el monto en rojo (`--shop-danger`) cuando hay saldo pendiente
- Ajuste equivalente en breakpoint mobile (620px)
