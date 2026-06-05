# Turnera: control fino de servicios visibles + split en landing

## Cambio

La pestaña `Turnera` suma seleccion individual de servicios visibles en la pagina publica y agrupa los servicios por tipo en la landing publica.

## Backend

- `core.BusinessProfile.public_hidden_service_ids: JSONField(default=list)` para guardar los IDs de servicios ocultos.
- Migration `core/0018_businessprofile_public_hidden_service_ids.py`.
- `BusinessProfileSerializer`: agrega `public_hidden_service_ids` al `Meta.fields` y un `validate_public_hidden_service_ids` que descarta no-numericos, duplicados y valores `<= 0`.
- `notifications.PublicLandingView`: ademas del filtro por `service_type__in=enabled_types`, excluye los IDs en `profile.public_hidden_service_ids`.
- Default vacio = se muestran todos los servicios (compatibilidad).
- Los flags previos (`public_show_wash_services`, `public_show_detailing_services`) siguen vigentes en el modelo y filtran como antes; en la UI dejan de exponerse porque las acciones masivas por grupo cubren ese caso.

## Frontend - Turnera

- `TurneraSettingsPanel` recibe la lista de `services` y agrega un bloque "Servicios visibles en la landing".
- Tres grupos: `Lavadero` (wash), `Combos` (combo), `Detailing`. Cada grupo solo aparece si tiene al menos un servicio activo.
- Por grupo, un boton inteligente:
  - Si todo el grupo esta oculto → "Mostrar todos".
  - Si al menos uno es visible → "Ocultar todos".
- Por servicio, un checkbox que togglea su ID en `businessForm.public_hidden_service_ids`.
- Se eliminan los checkboxes "Mostrar servicios de lavadero" y "Mostrar servicios de detailing" porque las acciones masivas los reemplazan.
- `frontend/lib/page-support.tsx`: `blankBusinessForm()` agrega `public_hidden_service_ids: []` y `frontend/app/page.tsx` sincroniza el campo desde el profile en `syncBusinessProfile` (con coercion a `number[]`).
- `frontend/app/page.tsx#buildBusinessProfilePayload`: ahora envia `public_hidden_service_ids`, `opening_time` y `closing_time` (los dos ultimos faltaban: estaban en el form pero no se persistian).
- `frontend/lib/data-loading.ts`: el dataset de `settings` ahora incluye `services` para que el panel tenga la lista al abrirlo.

## Frontend - Landing publica

- `frontend/app/publica/[slug]/PublicLandingClient.tsx` agrupa los servicios por tipo (Lavadero / Combos / Detailing) usando `useMemo`.
- Cada grupo se renderiza con un titulo `<h3 class="public-service-group-title">` arriba de la grilla.
- Los grupos sin servicios no se renderizan.
- Estilos: `frontend/app/styles/public.css` agrega `.public-service-group` y `.public-service-group-title`.

## Tests

Backend (`backend/tests/test_public_landing_requests.py`):
- `test_public_landing_hides_services_listed_in_hidden_service_ids`
- `test_business_profile_patch_normalizes_hidden_service_ids`
- `test_business_profile_rejects_non_numeric_hidden_service_ids`

Frontend (`frontend/lib/data-loading.test.mjs`): se actualiza la expectativa del dataset de settings para incluir `services`.

## Validacion

- `pytest` backend completo: passed.
- `vitest run --maxWorkers=1` frontend: 32 archivos / 284 tests passed.
- `tsc --noEmit`: limpio.
- `next build`: build exitoso.
