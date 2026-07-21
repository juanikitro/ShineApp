# Alta guiada: ocultar pasos durante la carga inicial

## Cambio

- El dashboard no muestra la alta guiada hasta recibir el perfil real del
  negocio.
- Evita que el estado inicial vacio se presente como los seis pasos pendientes.
- Una vez cargado el perfil, las actualizaciones posteriores de otros datos no
  ocultan el panel.

## Limites

- No cambia el contrato de `BusinessProfile`, la persistencia de descartes ni
  el calculo de progreso para un perfil ya cargado.
