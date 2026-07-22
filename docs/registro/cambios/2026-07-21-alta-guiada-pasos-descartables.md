# Alta guiada: pasos descartables por negocio

## Cambio

- Cada paso de alta guiada tiene una cruz al final de su card.
- La cruz solicita confirmacion y descarta el paso definitivamente para ese
  negocio; no hay una opcion de restaurarlo en la UI.
- El progreso se calcula solo sobre los pasos activos. Por ejemplo, descartar
  un pendiente en 4/6 deja el progreso en 4/5.
- Si no quedan pasos activos, el panel deja de mostrarse.

## Contrato

- `BusinessProfile.onboarding_dismissed_step_ids` persiste una lista sin
  duplicados de IDs de los seis pasos admitidos.
- `PATCH /api/settings/business-profile/` rechaza IDs desconocidos o valores
  nulos para evitar que un payload invalido altere el checklist.

## Limites

- El descarte no cambia configuracion, servicios, agenda, caja ni WhatsApp;
  solo indica que ese requisito no debe contarse en la guia de ese negocio.
