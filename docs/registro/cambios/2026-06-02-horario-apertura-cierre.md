# Horario de apertura y cierre en la pagina publica

**Fecha:** 2026-06-02

## Cambio

Se agrega configuracion de horario de apertura y cierre al `BusinessProfile`. El horario se expone en la landing publica y limita el rango seleccionable para el turno preferido.

## Alcance

- **Backend model** (`core/models.py`): campos `opening_time` y `closing_time` (`TimeField`, nulos por defecto).
- **Migracion** (`core/migrations/0015_businessprofile_opening_closing_time.py`).
- **Serializer admin** (`config/views.py`): campos incluidos en `BusinessProfileSerializer` para configuracion desde el panel.
- **Vista publica** (`notifications/views.py`): `opening_time` y `closing_time` se exponen en `GET /api/public/landing/{slug}/` como `"HH:MM"` o `null`.
- **Validacion** (`notifications/serializers.py`): si el negocio tiene horario configurado y el cliente envia `preferred_time`, se valida que no sea antes de la apertura ni despues del cierre. El cierre limita el ultimo turno (se acepta exactamente a esa hora).
- **Frontend** (`app/publica/[slug]/PublicLandingClient.tsx`): atributos `min`/`max` en `<input type="time">` y horario visible en la seccion de contacto.

## Tests

Cinco nuevos tests en `tests/test_public_landing_requests.py`:
- `test_public_landing_exposes_opening_and_closing_time`
- `test_public_landing_opening_closing_time_null_when_not_configured`
- `test_public_request_rejects_preferred_time_outside_business_hours`
- `test_public_request_no_time_restriction_when_hours_not_configured`
- `test_public_request_time_restriction_ignored_when_no_preferred_time`
