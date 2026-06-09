# Turnera: servicios desplegables, descripciones truncadas y contacto accionable

## Cambio

Mejoras de UI/UX en la landing publica (`/publica/<slug>`):

- Los grupos de servicios (Lavadero / Combos / Detailing) ahora son desplegables independientes, **colapsados por defecto**. El encabezado muestra un contador de seleccionados cuando esta cerrado.
- Las descripciones largas de servicio se truncan a ~2 lineas con un boton "Ver mas"/"Ver menos" por servicio.
- La imagen del negocio se muestra una sola vez (la grande). La marca junto al titulo siempre muestra la inicial, ya no duplica la imagen.
- El badge de telefono pasa a ser un boton a WhatsApp (`wa.me`).
- El badge de direccion pasa a ser un boton a Google Maps si el negocio cargo un enlace en su configuracion; si no, queda como el badge de texto actual.

## Backend

- `core.BusinessProfile.maps_url: URLField(max_length=500, blank=True)` (junto a `address`). `max_length=500` por los share-links `maps.app.goo.gl`.
- Migration `core/0022_businessprofile_maps_url.py`.
- `BusinessProfileSerializer.Meta.fields`: agrega `maps_url` + `validate_maps_url` (`value.strip()`; el `URLField` valida el formato).
- `notifications.PublicLandingView`: publica `business.maps_url` en el payload. La cache de edge (`s-maxage=120`) no se afecta: la respuesta es por slug y `maps_url` pertenece al mismo profile.

## Frontend

- `frontend/lib/contact-links.ts` (nuevo): helpers puros.
  - `whatsappUrl(raw)`: limpia no-digitos y antepone `54` si falta; devuelve `https://wa.me/<digits>` o `null`.
  - `mapsUrlIsUsable(value)`: centraliza la decision link-vs-span.
  - Limitacion documentada: no se agrega el `9` de moviles argentinos (no se puede distinguir movil de fijo desde el numero suelto; el negocio puede cargar el numero internacional completo).
- `frontend/lib/page-support.tsx` (`blankBusinessForm`): inicializa `maps_url: ''`.
- `frontend/app/page.tsx`: `syncBusinessProfile` coerciona `maps_url` desde el profile remoto y el PATCH del profile lo envia (`payload.append('maps_url', ...)`).
- `frontend/app/components/settings/BusinessSettingsPanel.tsx`: nuevo campo "Enlace de Google Maps" (`type="url"`) debajo de "Direccion comercial".
- `frontend/app/publica/[slug]/PublicLandingClient.tsx`:
  - Tipo `PublicLandingPayload.business` agrega `maps_url?: string`.
  - Estado `openGroups` (cerrados por defecto) + `expandedDescriptions` (Set de ids) con sus toggles. Encabezado de grupo como `<button aria-expanded>` con `ChevronDown` que rota y contador de seleccionados.
  - La card de servicio se reestructura: el area de seleccion es un `<button aria-pressed>` y la descripcion + "Ver mas" quedan como bloque hermano dentro de `.public-service-card` (evita un `<button>` anidado, que es HTML invalido). El truncado se decide por longitud (`DESCRIPTION_TRUNCATE_THRESHOLD = 120`) y el corte visual lo hace CSS line-clamp via `small[data-clamped]`.
  - El bloque de contacto soporta `href`: telefono -> WhatsApp (`whatsappUrl`), direccion -> Maps si `mapsUrlIsUsable(maps_url)`; si no hay href, queda `<span>`. La marca siempre renderiza la inicial.
- `frontend/app/styles/public.css`: estilos de `.public-service-group-toggle`/chevron/contador, reestructura de `.public-service-card` + `.public-service-card-select`, descripcion truncada + `.public-service-desc-toggle`, y enlaces de contacto (`.public-contact a`). Reusa tokens; mantiene foco visible y responsive a 1 columna.

## Tests

Backend:
- `test_public_landing_requests.py::test_public_landing_exposes_maps_url_when_configured` (vacio y con valor).
- `test_business_profile.py`: PATCH persiste `maps_url`; default `""`; `test_business_profile_rejects_invalid_maps_url` (URL invalida -> 400).

Frontend:
- `frontend/lib/contact-links.test.mjs` (nuevo): `whatsappUrl` (+54, respeta codigo existente, null) y `mapsUrlIsUsable`.
- `PublicLandingClient.test.tsx`: grupos colapsados que abren al tocar; "Ver mas" expande y cambia `data-clamped`; descripcion corta sin boton; telefono -> `wa.me/54...`; direccion con/sin `maps_url`; marca con inicial sin imagen duplicada. Se actualizaron los 2 tests previos para abrir el grupo antes de seleccionar el servicio.
- `BusinessSettingsPanel.test.tsx` (nuevo): el input "Enlace de Google Maps" refleja el form y emite el patch.

## Notas

- No cambia contratos existentes: el payload de la landing solo agrega `business.maps_url`; clientes viejos lo ignoran.
- Decision de no auto-prefijar `https://` en `maps_url`: el `type="url"` + placeholder guian; auto-prefijo queda como mejora futura.
