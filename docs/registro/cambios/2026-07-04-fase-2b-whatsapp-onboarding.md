# Fase 2B - onboarding WhatsApp

Se agrega un primer arranque guiado para WhatsApp dentro de Configuracion.

## Cambios

- La seccion WhatsApp muestra un checklist de conexion, templates, reglas e
  historial.
- Se agrega la accion `Preparar WhatsApp demo` para dejar el canal en provider
  `fake`, sin credenciales externas.
- La accion crea templates base faltantes y activa reglas automaticas usando los
  endpoints existentes.
- La configuracion avanzada de Meta Cloud API sigue disponible debajo del
  primer arranque.

## No incluido

- Webhook inbound de WhatsApp.
- Alta asistida real de Meta Business.
- Worker nuevo o endpoint backend de bootstrap.
