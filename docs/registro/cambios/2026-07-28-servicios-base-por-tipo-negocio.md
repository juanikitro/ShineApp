# Servicios base por tipo principal de negocio

## Cambio

- `BusinessProfile.business_type` permite elegir `lavadero`, `detailing` o
  `lubricentro`; queda nullable para no clasificar perfiles existentes.
- Configuración > Negocio expone el selector y `GET/PATCH
  /api/settings/business-profile/` devuelve y valida el campo.
- La alta guiada exige el tipo principal para completar "Negocio listo" y
  lleva a Configuración > Negocio cuando falta.
- Los servicios base ahora se generan como un único pack de tres servicios en
  el sector del tipo elegido. Sin tipo no se ofrece la creación y se indica
  dónde elegirlo.
- El paso Servicios se completa solo cuando están activos los tres servicios
  del pack elegido en su sector; no exige servicios en los demás sectores.
- La proyección de tareas de alta guiada usa el mismo criterio, por lo que una
  tarea previa no puede marcar listo un negocio sin tipo ni un pack incompleto.

## Compatibilidad

- La migración no completa ni modifica datos existentes. Los perfiles sin tipo
  mantienen sus sectores y no reciben servicios automáticamente.
- Los precios y duraciones reutilizan equivalentes del seed demo. Los servicios
  sin precio canónico empiezan en `0.00` con una nota para definirlo antes de
  publicarlos.
