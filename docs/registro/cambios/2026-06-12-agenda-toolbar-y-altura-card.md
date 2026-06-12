---
date: 2026-06-12
title: "Agenda: toolbar de navegacion horizontal y altura de cards ajustada"
area: frontend/ui
---

# Agenda: toolbar de navegacion horizontal y altura de cards ajustada

Dos arreglos visuales sobre la agenda operativa.

## 1. Fila de navegacion entre fechas en una sola linea

`.agenda-nav` tenia `flex-wrap: wrap`, lo que permitia que la grilla contenedora (`.agenda-toolbar-tools`, que usa `display: grid` sin columnas explicitas) se reduzca al ancho minimo de un solo boton. Resultado: input de fecha + 5 botones (`<<`, `<`, Hoy, `>`, `>>`) se quebraban en 3 lineas verticales.

- `.agenda-nav`: `flex-wrap: wrap` -> `flex-wrap: nowrap`
- `.agenda-nav-row`: `flex-wrap: nowrap` explicito (refuerzo)

La media query de `<=980px` ya tenia `flex-wrap: nowrap` con `overflow-x: auto`, asi que el comportamiento responsive se mantiene.

## 2. Input de fecha con contraste

El input estaba con `background: transparent` y borde transparente, por lo que solo se distinguia en hover. Ahora siempre se ve.

- `background: var(--color-surface-raised)`
- `border-color: var(--shop-border-strong)`
- `color: var(--color-text)` y `font-weight: 600`
- Hover usa `--color-surface-interactive` y borde `--color-primary`

Tokens semanticos para que dark theme tambien funcione.

## 3. Altura de cards reducida

Las cards del board temporal (`--spanning`) tenian `--agenda-instance-card-height: 284px` y dejaban un hueco visible entre el contenido (kicker + titulo + servicios + vehiculo + rango) y la fila de deuda/acciones.

- Desktop: 284px -> 232px
- Mobile (<=620px): 264px -> 220px (y `min-height` del board y de `day-row` ajustados de 492 a 420)

La altura fija sigue siendo necesaria para que las cards alineen visualmente entre columnas del board. Solo se reduce al minimo razonable para el contenido tipico (1-2 servicios con line-clamp 2, vehiculo y rango opcional).

## Archivos modificados

- `frontend/app/styles/agenda.css`

## Validacion

- Cambio CSS puro, sin tocar TS, tests ni logica.
- Worktree sin `node_modules` instalado: no se corrio build local.
