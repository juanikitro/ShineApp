# Fase 2A - onboarding real guiado

Se agrega una capa de onboarding para negocios reales vacios, sin crear un
wizard persistido ni tablas nuevas.

## Cambios

- El panel del dashboard cambia a "Alta guiada" cuando el negocio todavia no
  esta listo para vender u operar.
- El progreso se calcula desde datos reales: negocio, servicios, turnera,
  WhatsApp, agenda y caja.
- El paso de servicios ofrece crear servicios base para lavadero, detailing y
  lubricentro.
- La creacion de servicios base usa `/services/`, evita duplicados por nombre
  normalizado y respeta los sectores existentes.
- La pantalla de Servicios tambien muestra el atajo cuando el negocio esta
  vacio o incompleto.

## No incluido

- Un wizard persistido de avance: el progreso sigue derivandose de datos reales.
  Solo se guardan los pasos descartados definitivamente por el negocio.
- Billing, planes o checkout.
- Consola interna.
- Inventario avanzado en la primera experiencia.
