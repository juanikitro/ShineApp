# Push notification al confirmar turno

## Contrato

- El cliente puede recibir una push notification del navegador cuando el negocio confirma su turno.
- La suscripción push es opcional; si el usuario no otorga permiso o el navegador no soporta Push API, el formulario sigue funcionando normalmente.
- El campo `push_subscription` (JSON, nullable) se agrega a `PublicRequest`.
- El endpoint `POST /api/public/landing/<slug>/requests/` acepta `push_subscription` como campo opcional.
- El dispatch de la push ocurre en `ReservationViewSet.confirm()`, solo si la reserva viene de una solicitud pública.

## Componentes

- **Backend**: `pywebpush>=2.0` en `requirements.txt`; campo `push_subscription` en modelo y migración `0003`; función `send_public_request_push()` en `notifications/service.py`; campo write-only en `PublicLandingRequestSerializer`; llamada en `scheduling/views.py:confirm()`.
- **Frontend**: `frontend/public/sw.js` (service worker); `registerPushSubscription()` en `PublicLandingClient.tsx`; `push_subscription` incluido en el payload del formulario.
- **Env vars**: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_CLAIMS_EMAIL` (backend); `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (frontend).

## Reglas

- `push_subscription` no se expone en ninguna respuesta de API (write-only).
- Si `VAPID_PRIVATE_KEY` está vacío, `send_public_request_push` devuelve False sin lanzar excepción.
- Errores de envío se loguean pero no bloquean la confirmación del turno.
- Generar VAPID keys con: `npx web-push generate-vapid-keys`.
