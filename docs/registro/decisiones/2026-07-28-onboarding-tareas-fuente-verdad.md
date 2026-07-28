# Alta guiada: tareas vinculadas como proyeccion de hechos reales

## Decision

Las seis tareas de onboarding son una proyeccion persistida de los hechos reales
del negocio, no un checklist editable. `Task.onboarding_step_id` es el vinculo
estable y la regla de calculo vive en `tasks.onboarding`.

## Consecuencias

- Dashboard y Tareas comparten el estado devuelto por la API de Tareas.
- La constraint parcial permite recrear un paso luego de un soft-delete sin
  duplicar tareas activas durante concurrencia.
- Las escrituras se disparan solo tras mutaciones relevantes y despues del
  commit; GET y render de frontend permanecen sin side effects.
- El descarte de un paso usa el mismo soft-delete que el resto del modulo, por
  lo que deja de aparecer en ambas superficies sin borrar el historial.
