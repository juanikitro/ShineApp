# Duracion de servicios en minutos / horas / dias / semanas (2026-06-05)

**Necesidad:** la duracion estimada de un servicio se ingresaba y se mostraba
solo en minutos, lo que obligaba a calcular mentalmente para detallings que
toman varias horas, servicios premium de uno o varios dias, o packs que se
extienden por semanas.

**Cambio:** el formulario de servicio ahora pide la duracion como una cantidad
mas una unidad (Minutos, Horas, Dias o Semanas) y la visualizacion en cards,
dashboard y landing publica usa la unidad mas natural sin perder precision
(`60 min` -> `1 h`, `1500 min` -> `1 d 1 h`, `10080 min` -> `1 sem`).

**Contrato backend:** sin cambios. El campo canonico sigue siendo
`Service.estimated_duration_minutes` (`PositiveIntegerField`, default `60`),
las migraciones y los serializers no se tocaron. La unidad seleccionada por el
usuario vive solo en el estado del formulario (`estimated_duration_unit`); el
payload enviado al backend convierte siempre a minutos enteros con
`Math.round(amount * factor)`.

**Carga de servicios existentes:** al editar, el form elige la unidad mas
grande que represente exactamente los minutos guardados. Asi un servicio de
`60` minutos se carga como `1 hora`, uno de `90` minutos como `90 minutos` y
uno de `10080` minutos como `1 semana`.

**Archivos tocados:**
- `frontend/lib/service-duration.ts` (nuevo): conversion, formato compacto y
  helpers de form (`durationToMinutes`, `formatDurationLabel`,
  `readDurationDraft`, `writeDurationDraft`).
- `frontend/lib/service-duration.test.mjs` (nuevo): 19 casos cubriendo
  conversiones, edge cases y serializacion del form.
- `frontend/app/components/ui/DurationInput.tsx` (nuevo): control reutilizable
  input + select que opera sobre cualquier form con keys configurables (por
  defecto las del Service).
- `frontend/app/components/forms/ServiceForm.tsx`: reemplaza el input "Duracion
  estimada" por `DurationInput`.
- `frontend/app/page.tsx`: el editor inline del detalle de servicio y el modal
  rapido "Nuevo servicio" usan `DurationInput`.
- `frontend/app/components/services/ServicesPanel.tsx`: cards y dashboard
  muestran `formatDurationLabel` en vez de `... min` crudo.
- `frontend/app/publica/[slug]/PublicLandingClient.tsx`: el helper local
  `serviceDurationLabel` ahora delega en `formatDurationLabel`.
- `frontend/app/styles/shell.css`: estilos del nuevo `.duration-input`
  (grid 2 columnas, select min-height 44px coherente con el resto del form).

**Validacion:**
- `npx vitest run lib/service-duration.test.mjs`: 19/19 ok.
- `npm run validate` (vitest + next build) ejecutado desde `frontend/`.

**Compatibilidad:**
- API publica intacta: el campo `estimated_duration_minutes` sigue siendo el
  unico que el backend conoce. Los tests existentes que usan minutos directos
  (`estimated_duration_minutes=90`, `60`, `180`, etc.) no requieren cambios.
- El payload enviado incluye `estimated_duration_unit` como campo extra; DRF
  lo ignora porque no esta en `ServiceSerializer.Meta.fields`. No persiste en
  base, no contamina la API.
