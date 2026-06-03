# fix(ui): simetria y espacios en blanco en Dashboard y Dashboard de cliente

**Fecha:** 2026-06-03
**Rama:** claude/vigilant-turing-5f3e4a

## Problema

- **Dashboard:** la cabina economica (`dashboard-insight-grid`) dejaba un gran hueco
  vacio debajo de la columna izquierda ("Composicion economica"). La columna derecha
  (alertas + lectura rapida + a cobrar primero + comparacion) era mucho mas alta y
  estiraba la fila, dejando ~460px de workspace vacio a la izquierda.
- **Dashboard de cliente:** el badge de cumpleanos se estiraba a todo el ancho del
  titulo (barra rara en el hero). Los pares "Vehiculos / Agenda" y "Cotizaciones /
  Historial de ventas" usaban `grid two` (columna angosta 300-390px + columna ancha),
  lo que dejaba la agenda vacia ocupando una franja ancha y los vehiculos apretados.

## Causa raiz

- `dashboard-insight-grid` es un grid de 2 columnas con alturas muy desparejas. Con
  `align-items: stretch` (default) la fila toma la altura de la columna mas alta y la
  mas corta queda con un vacio debajo. El panel "Comparacion" (lista vertical de 5
  registros) inflaba la columna derecha ~300px.
- El badge (`.birthday-badge`, `display: inline-flex`) es item de un grid de una sola
  columna (`.customer-dashboard-title`); con `justify-self: stretch` (default) se
  estiraba a todo el ancho.
- `grid two` esta pensado para layout lista+detalle (columna fija angosta + flexible),
  no para pares de paneles equivalentes.

## Fix

Cambios solo de layout/CSS; sin tocar logica de negocio ni datos.

- **Dashboard:** "Comparacion" se movio fuera del `dashboard-side-stack` a una banda
  full-width debajo del `dashboard-insight-grid`, renderizada como fila horizontal de
  tarjetas (`repeat(auto-fit, minmax(min(100%, 190px), 1fr))`) en lugar de lista
  vertical. `dashboard-insight-grid` ahora usa `align-items: start`. Resultado: el
  hueco bajo "Composicion economica" se reduce ~65% y la comparacion queda mas
  escaneable y consistente con las otras bandas full-width de la pagina.
- **Dashboard de cliente:**
  - `.customer-dashboard-title .birthday-badge { justify-self: start }` → el badge
    vuelve a ser un chip del ancho de su contenido.
  - Nueva clase `.customer-dashboard-duo` (2 columnas iguales `1fr 1fr`,
    `align-items: start`) reemplaza `grid two` en los pares Vehiculos/Agenda y
    Cotizaciones/Historial. Colapsa a 1 columna en `<= 980px` (forms.css).

## Archivos modificados

- `frontend/app/components/dashboard/DashboardPanel.tsx` — mover panel "Comparacion" a banda full-width + clase `dashboard-comparison-panel`.
- `frontend/app/page.tsx` — `grid two` → `grid customer-dashboard-duo` en los dos pares del dashboard de cliente.
- `frontend/app/styles/shell.css` — `align-items: start` en insight-grid; banda horizontal de comparacion; `customer-dashboard-duo`; badge `justify-self: start`.
- `frontend/app/styles/forms.css` — colapso responsive de `customer-dashboard-duo`.

## Validacion

- `npm run test` → 31 archivos, 278 tests OK.
- `npm run build` → compila, lint y types OK.
- Verificacion de layout con harness estatico (medidas DOM): insight-grid
  `align-items: start`; banda "Comparacion" full-width debajo del grid con 5 tarjetas
  en fila; duo de cliente 2 columnas iguales; badge a ancho de contenido.
