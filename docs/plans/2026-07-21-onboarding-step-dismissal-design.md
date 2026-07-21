# Descarte definitivo de pasos de alta guiada

## Objetivo

Permitir que cada negocio descarte de forma definitiva los pasos de alta guiada
que no desea completar, sin que esos pasos sigan contando en su progreso.

## Decisiones aprobadas

- El descarte se persiste por negocio y no depende del navegador.
- Cada paso tiene una cruz al final de su card.
- La accion es definitiva: no se ofrece una opcion de restaurarla en la UI.
- Antes de confirmar el descarte, la UI advierte que no podra revertirse.

## Diseno

`BusinessProfile` guarda una lista de IDs de pasos descartados. El serializer
acepta solo IDs conocidos, elimina duplicados y mantiene el scoping actual del
endpoint de perfil por negocio.

`buildDemoReadiness` construye los seis pasos desde datos reales y luego omite
los descartados antes de derivar total, completados, porcentaje y siguiente
paso. Por ejemplo, al descartar un pendiente con progreso 4/6, el resultado es
4/5. Si se descarta un paso ya listo, deja de contar tambien como completado.

La card delega el descarte al dashboard. Este persiste el nuevo listado por el
endpoint existente de perfil y actualiza el estado local solo con la respuesta
exitosa. Si la API falla, el paso sigue visible y se muestra el feedback de
error existente.

Cuando no queda ningun paso activo, el dashboard deja de renderizar el panel
para no mostrar un progreso 0/0.

## Pruebas

- API de perfil: persiste IDs validos, elimina duplicados y rechaza IDs
  desconocidos.
- Helper de readiness: recalcula los conteos con pasos descartados, incluso
  cuando se descarta uno terminado o todos los pasos.
- Componente: expone una cruz accesible, pide confirmacion y delega el ID del
  paso confirmado.

## Riesgos y limites

- La decision no se puede restaurar desde la UI por definicion de producto.
- La lista de IDs se valida en backend para que un payload arbitrario no altere
  el calculo del dashboard.
- No modifica los datos operativos que determinan si un paso esta listo; solo
  cambia cuales son requeridos por el checklist.
