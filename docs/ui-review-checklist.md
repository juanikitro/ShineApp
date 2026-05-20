# UI Review Checklist

Usar antes de considerar completo un cambio UI grande, sensible o que afecte patrones compartidos. Para un tweak local, aplicar solo los items relevantes.

## Contexto y alcance

- [ ] Lei `docs/ia/UI_CONTEXT.md`.
- [ ] Lei `docs/design-brief.md` si cambio jerarquia, copy, paleta o tono.
- [ ] Lei `docs/design-system.md` si toque tokens, layout base o primitives.
- [ ] Lei `docs/inspiration.md` solo si el pedido incluyo direccion visual nueva.
- [ ] Preserve comportamiento existente salvo pedido explicito.
- [ ] Evite tocar logica de negocio para un pedido puramente visual.

## Jerarquia y layout

- [ ] Hay una accion primaria clara en la pantalla o panel local.
- [ ] El espaciado sigue la escala documentada o el patron existente.
- [ ] La jerarquia tipografica se entiende rapido.
- [ ] La UI quedo mas simple o clara.
- [ ] El layout sigue funcionando dentro de la shell actual.
- [ ] Los formularios create/edit viven en popups/modales salvo excepcion justificada.

## Reuso e implementacion

- [ ] Reuse componentes o patrones existentes antes de crear nuevos.
- [ ] Evite estilos arbitrarios u one-off.
- [ ] Si repetia un estilo, lo movi a CSS.
- [ ] Los colores vienen de tokens o del plan de tokens documentado.

## Color y marca

- [ ] El resultado respeta el CRM claro: sidebar blanco, workspace gris suave, paneles blancos y texto oscuro.
- [ ] Si afecte dark mode, preserva navy shell y texto claro legible.
- [ ] Las acciones primarias son azules y distinguibles.
- [ ] Las acciones destructivas/reset son rojas y no compiten con primarias.
- [ ] Bordes y sombras son sutiles.
- [ ] El azul no quedo sobreusado como decoracion.

## Estados y feedback

- [ ] Estados de carga, vacio y error siguen claros si el flujo los tiene.
- [ ] Las acciones destructivas estan diferenciadas.
- [ ] El feedback de exito/error aparece cerca del flujo afectado.

## Responsive y accesibilidad

- [ ] El cambio funciona en los breakpoints actuales.
- [ ] El foco de teclado es visible.
- [ ] El contraste es aceptable en texto, iconos, bordes, foco y estados.
- [ ] El color no es el unico canal para comunicar estado.
- [ ] Los targets tactiles son razonables cuando aplica mobile.

## Cierre

- [ ] Revise el flujo real tocado, no solo markup aislado.
- [ ] Ejecute `npm run build` y tests frontend relevantes.
- [ ] Si el cambio fue grande, resumi trade-offs y riesgos.
