# Onboarding y trial: CTA comercial y contraste tematico

## Cambios

- La franja de prueba reemplaza el copiado manual y la URL configurable por el
  enlace `Contratar ShineApp`, que abre WhatsApp con el mensaje de continuidad
  precompletado en una pestaña nueva.
- `Alta guiada` incorpora un control plegable local; inicia expandida y no
  cambia los pasos, el progreso ni el descarte persistente del negocio.
- La accion primaria se muestra dentro de `Siguiente paso`. El bloque `Primer
  recorrido operativo` conserva solo su explicacion para no duplicar acciones.
- Cada card de paso presenta su accion antes del estado y conserva el descarte
  accesible al final.
- Las superficies y estados de la guia usan tokens de tema, incluido un borde
  semantico para los pasos listos, para mantener contraste en claro y oscuro.

## Limites

- No cambian endpoints, payloads, permisos, datos de negocio ni la integracion
  existente entre Dashboard y Tareas.
- El CTA no incorpora billing, checkout ni activacion automatica de planes.

## Validacion

- Tests focalizados para el enlace WhatsApp, el copy del trial, el plegado, el
  orden de controles, las acciones de primer turno/cobro y la navegacion a
  Tareas desde el Dashboard.
