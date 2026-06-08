# Deploy: documentar VAPID keys para push notifications

## Contexto

El sistema de push notifications al negocio (cuando llega una solicitud desde
la turnera publica) y al cliente (cuando el negocio confirma el turno) ya esta
implementado en codigo: `notifications/service.py` envia push con `pywebpush`,
el dashboard del negocio registra suscripcion en `frontend/app/page.tsx` y la
turnera publica hace lo mismo en `PublicLandingClient.tsx`. Sin embargo, en
produccion las notificaciones no estaban llegando.

Causa raiz: las variables VAPID (`VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`,
`VAPID_CLAIMS_EMAIL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) nunca se documentaron
como requeridas en el deploy productivo. Sin esas claves:

- `send_business_push_notification` y `send_public_request_push` cortan
  temprano y devuelven `False` silenciosamente (no hay log, no hay alerta).
- El frontend ni siquiera registra el service worker, por lo que ningun
  `UserProfile.push_subscription` se guarda en la DB.

El resultado es un pipeline silenciosamente roto: el endpoint responde 201
exitoso, el email llega, pero la push prometida nunca sale.

## Cambio

Cambios solo de documentacion; no se toca codigo ni configuracion runtime.

- `docs/deployment/env-vars.md`: nueva seccion explicando las 4 VAPID vars
  (privada, publica, claims email, publica frontend) con su proposito,
  comportamiento si falta y comando de generacion.
- `docs/deployment/vercel.md`: las 4 vars se agregan a las listas de env
  vars requeridas en backend (`shineapp-api`) y frontend (`shineapp-web`).
- `docs/deployment/manual-steps.md`: nuevo paso 18 con el procedimiento
  completo de generacion (`npx web-push generate-vapid-keys`), carga en
  ambos proyectos Vercel, validacion end-to-end (suscripcion + push de
  prueba desde la turnera) y nota de rotacion. El paso "Gate De Rollback"
  pasa a ser 19.

## Reglas

- `VAPID_PUBLIC_KEY` y `NEXT_PUBLIC_VAPID_PUBLIC_KEY` deben coincidir
  exactamente; si difieren, la subscripcion del navegador es rechazada.
- `VAPID_PRIVATE_KEY` es secreto: no commitear, no compartir por chat.
- Rotar las VAPID keys invalida todas las suscripciones existentes;
  comunicar antes de hacerlo.
- `scripts/deploy/verify-env.ps1` no valida las VAPID vars todavia. Si
  estan vacias el deploy sigue verde y las push quedan mudas. Mejora
  pendiente: agregar warning no bloqueante.

## Archivos modificados

- `docs/deployment/env-vars.md`
- `docs/deployment/vercel.md`
- `docs/deployment/manual-steps.md`

## Validacion

- Cambios solo de documentacion; no hay tests que correr.
- Para validar end-to-end despues de cargar las VAPID keys en Vercel,
  seguir el bloque "Validar" del paso 18 de `manual-steps.md`.
