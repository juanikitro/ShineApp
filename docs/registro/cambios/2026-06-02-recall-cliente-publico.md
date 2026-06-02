# Autocompletar datos del cliente en página pública

**Fecha:** 2026-06-02

## Que cambió

Se agregó la posibilidad de que un cliente que ya visitó el negocio pueda recuperar sus datos en el formulario público de solicitud de turno/cotización, sin exponer información de otros clientes.

## Mecanismo en dos capas

### 1. localStorage (sin servidor)

Al enviar una solicitud exitosa, el formulario guarda los datos del cliente (nombre, teléfono, email, vehículo) en `localStorage` con clave `shine_client_{slug}`. En la próxima visita desde el mismo dispositivo, aparece un banner:

> "Tenemos tus datos del turno anterior guardados."

Con dos opciones: **Usar mis datos** (completa el formulario) o **Descartar** (limpia el storage).

### 2. Lookup por teléfono o email (servidor)

Para visitas desde otro dispositivo, el formulario tiene un link "¿Ya sos cliente? Recuperar mis datos" que expande un campo donde el usuario puede ingresar su teléfono o email. El backend busca coincidencia exacta y, si la encuentra, devuelve los datos del cliente y sus vehículos.

## Seguridad

- El endpoint `/api/public/landing/{slug}/recall/` es público (AllowAny) pero con rate limit de **3 intentos por IP cada 15 minutos** (via Django cache).
- Solo se busca por coincidencia exacta (no fuzzy) de teléfono (normalizado a dígitos) o email (case-insensitive).
- La búsqueda está estrictamente aislada por `business` — nunca se expone un cliente de otro negocio.
- Los clientes inactivos (soft-deleted) no aparecen en los resultados.

## Archivos modificados

- `backend/notifications/views.py`: nueva clase `PublicLandingRecallView`
- `backend/config/urls.py`: nuevo path `api/public/landing/<slug>/recall/`
- `backend/tests/test_public_landing_requests.py`: 7 tests nuevos del recall
- `frontend/app/publica/[slug]/PublicLandingClient.tsx`: localStorage + UI de recall
- `frontend/app/styles/public.css`: estilos `.public-recall-*`

## Sin migraciones

No se agregaron modelos ni migraciones. El rate limiting usa el cache de Django (LocMemCache por defecto).
