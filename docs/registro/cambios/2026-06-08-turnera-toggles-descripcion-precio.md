# Turnera: toggles para mostrar descripcion y precio del servicio

## Cambio

La pestana `Turnera` suma dos toggles independientes para controlar si la landing publica muestra la `descripcion` y el `precio` de cada servicio.

## Backend

- `core.BusinessProfile.public_show_service_description: BooleanField(default=True)`.
- `core.BusinessProfile.public_show_service_price: BooleanField(default=False)`.
- Migration `core/0021_businessprofile_public_service_display_flags.py`.
- `BusinessProfileSerializer.Meta.fields`: agrega ambos campos.
- `notifications.PublicLandingServiceSerializer`: expone `base_price` y filtra `notes`/`base_price` segun el contexto `show_description`/`show_price`.
- `notifications.PublicLandingView`: pasa los flags al serializer y publica `display: { show_service_description, show_service_price }` en el payload, util para que el frontend sepa el estado sin inferirlo de la presencia de campos.

Defaults elegidos para preservar comportamiento existente:
- `public_show_service_description=True`: hoy las notas se muestran si existen.
- `public_show_service_price=False`: hoy el precio nunca se exponia (el test `test_public_landing_is_available_without_auth_and_hides_prices` lo certifica).

## Frontend

- `TurneraSettingsPanel` agrega una fila con dos checkboxes:
  - "Mostrar descripcion del servicio" -> `public_show_service_description`.
  - "Mostrar precio del servicio" -> `public_show_service_price`.
- `frontend/lib/page-support.tsx` (`blankBusinessForm`): inicializa ambos flags con sus defaults.
- `frontend/app/page.tsx`:
  - `syncBusinessProfile`: coercion segura desde el profile remoto.
  - `buildBusinessProfilePayload`: envia ambos flags al PATCH del profile.
- `frontend/app/publica/[slug]/PublicLandingClient.tsx`:
  - Tipo `PublicService` agrega `base_price`.
  - Tipo `PublicLandingPayload` agrega `display`.
  - La descripcion (`<small>`) se renderiza solo si `display.show_service_description !== false`.
  - El precio (`<span class="public-service-price">`) se renderiza solo si `display.show_service_price === true` y `base_price` tiene valor; se formatea como ARS sin decimales (mismo estilo que el resto del CRM).
- `frontend/app/styles/public.css`: agrega `.public-service-price`.

## Tests

Backend (`backend/tests/test_public_landing_requests.py`):
- `test_public_landing_defaults_hide_price_and_show_description`.
- `test_public_landing_exposes_price_when_flag_enabled`.
- `test_public_landing_hides_description_when_flag_disabled`.
- `test_business_profile_patch_persists_service_display_flags`.

Frontend (`frontend/app/components/settings/TurneraSettingsPanel.test.tsx`):
- Renderiza ambos checkboxes con los defaults del form.
- Toggling cada uno emite el patch correcto.

## Notas

- No cambia ningun contrato existente: el payload sigue siendo compatible para clientes viejos; solo agrega `display` y opcionalmente `base_price` por servicio.
- La cache de edge (`s-maxage=120`) sigue siendo correcta: la respuesta es por slug y los flags pertenecen al profile del mismo slug.
