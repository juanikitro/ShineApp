# Botones globales compactos

Fecha: 2026-05-09

## Contexto

La UI tenia un baseline de botones demasiado pesado para una superficie CRM operativa, especialmente en cards, listados, cotizaciones y acciones de agenda.

## Cambio

- El boton base queda en 36px de alto con padding y tipografia mas compactos.
- Las acciones dentro de `.record-actions` usan una densidad reutilizable de 32px.
- Los botones con icono usan 36px cuadrados.
- `primary` conserva jerarquia visual con relleno azul.
- `ghost` queda mas liviano por defecto.
- `danger` queda como accion destructiva tonal para no competir visualmente con el CTA principal.
- Los botones dejan de estirarse como grid items salvo controles que ya declaran ancho completo.

## Validacion esperada

Revisar agenda/trabajos, cotizaciones, formularios modales y configuracion en light y dark mode. Los botones no deben generar overflow de texto ni estirar cards/listados.
