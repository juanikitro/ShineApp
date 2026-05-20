# Activos De Inspiracion De Diseno

Esta carpeta guarda material de referencia visual para orientar trabajo futuro de UI.

Contenido permitido:

- capturas de pantalla
- mockups
- capturas anotadas
- wireframes
- especificaciones de diseno exportadas

## Reglas De Nombres

Usa nombres de archivo descriptivos y ordenables.

Patrones preferidos:

- `YYYY-MM-DD-source-screen-topic.ext`
- `source-feature-variant.ext`
- `internal-screen-state-note.ext`

Ejemplos:

- `2026-05-06-linear-sidebar-density.png`
- `stripe-dashboard-card-rhythm.png`
- `internal-workorder-modal-mobile.png`

## Como Referenciar Estos Archivos En Prompts Futuros

Los prompts futuros deben mencionar la ruta exacta y la intencion exacta.

Buen ejemplo:

- "Usa `assets/design-inspo/2026-05-06-linear-sidebar-density.png` como referencia de espaciado y densidad para el sidebar y la lista de registros. No copies el layout."

Mal ejemplo:

- "Hacelo como la captura."

Los prompts siempre deben decir:

- que archivo es relevante
- que parte sirve
- que no debe copiarse

## Regla Importante

Estos archivos son inspiracion, no activos para copiar directamente.

No hacer:

- copiar logos
- copiar colores de marca
- copiar ilustraciones
- copiar layouts exactos
- tratar capturas externas como activos del producto

## Regla De Documentacion

Cada vez que se agregue una captura o mockup aca, actualizar `docs/inspiration.md` con:

- la fuente
- que tomar como referencia
- que no copiar
- donde aplica en ShineApp
