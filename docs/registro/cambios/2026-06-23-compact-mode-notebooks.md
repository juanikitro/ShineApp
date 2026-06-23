# compact mode notebooks

- fecha: 2026-06-23
- tipo: ui
- area: frontend

## que cambia

- agrega compact mode mixto para notebooks viejas en la shell principal
- reduce padding, gaps, alturas minimas y escala de cards en viewport desktop con altura baja
- compacta dashboard y agenda sin tocar logica ni contratos

## criterio

- activa en desktop/tablet grande: `min-width: 981px`
- perfil compacto base: `max-width: 1440px` + `max-height: 900px`
- perfil mas denso: `max-width: 1366px` + `max-height: 820px`

## impacto visible

- entra mas contenido above-the-fold en `1366x768` y `1280x720`
- sidebar, topbar, paneles y cards dejan de verse sobredimensionados
- agenda semanal gana densidad sin perder legibilidad

## validacion esperada

- dashboard visible y util en `1366x768`
- dashboard visible y util en `1280x720`
- mobile mantiene sus breakpoints existentes
