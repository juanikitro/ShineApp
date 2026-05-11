# UI_CONTEXT.md

Guia corta para cambios de UI en ShineApp.

Fuente de verdad general: `../../AGENTS.md`.

## Lectura minima

Para cambios UI puntuales:
1. archivo TSX/TS objetivo
2. partial CSS relevante en `frontend/app/styles/`
3. esta guia

Sumar contexto solo si el cambio lo requiere:
- `docs/design-brief.md` si cambia jerarquia, copy, paleta o tono.
- `docs/design-system.md` si cambia tokens, layout base, primitives o patron compartido.
- `docs/inspiration.md` si el usuario pide una direccion visual nueva.
- `docs/ui-review-checklist.md` antes de cerrar cambios grandes o sensibles.
- `docs/contexto/arquitectura.md` si cruza backend y frontend.

## Superficies reales

- `frontend/app/page.tsx`: orquesta vistas, fetch y flujos del home principal.
- `frontend/lib/page-support.tsx`: helpers compartidos, labels, hooks, formularios base y feedback.
- `frontend/app/components/ui/`: primitives reusables.
- `frontend/app/styles/tokens.css`: tokens y temas.
- `frontend/app/styles/base.css`: reset, botones, inputs, combos y login.
- `frontend/app/styles/shell.css`: shell, paneles, records, modales, toasts y superficies compartidas.
- `frontend/app/styles/agenda.css`: agenda operativa y cards.
- `frontend/app/styles/forms.css`: quote lines, responsive y motion global.

## Reglas visuales

- Default visual: CRM claro y sobrio.
- Mantener sidebar blanco, workspace gris suave, paneles blancos, texto oscuro, primario azul y destructivo rojo.
- Dark navy es variante soportada, no default.
- Usar tokens semanticos cuando sea posible; no dispersar hex sueltos en JSX/CSS.
- Reusar componentes y patrones actuales antes de crear otros.
- Evitar estilos inline si la regla puede vivir en una partial CSS.
- Mantener contraste, foco visible, teclado, responsive y toggle claro/oscuro cuando se toque UI.
- No cambiar logica de negocio para un pedido puramente visual.

## Regla practica

Si el cambio es local de texto, espaciado o estado puntual, no leas toda la documentacion de diseno. Si toca layout compartido, tema, agenda o primitives, subi un nivel y lee la doc especifica.
