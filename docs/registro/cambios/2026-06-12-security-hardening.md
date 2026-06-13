# Endurecimiento de seguridad (auditoría completa, por fases)

Remediación de los hallazgos de la auditoría de seguridad previa al despliegue
público. Se aplica por fases priorizadas (CRÍTICO → INFO). Cambios pensados para
**producción con datos reales**: retrocompatibles, sin pérdida de datos.

Acciones de operador (variables de entorno y rotación de secretos) en
`docs/deployment/security-runbook.md`.

## Fase 1 — Explotables sin/poco acceso

- **Recall público sin PII** (`notifications/views.py`): el endpoint
  `POST /api/public/landing/<slug>/recall/` dejó de devolver datos del cliente
  (nombre/email/teléfono/patentes) y de confirmar si un contacto existe. Antes,
  sin autenticación, permitía cosechar el padrón de clientes de un negocio. Se
  mantiene la forma de respuesta (campos en `null`) para no romper el frontend.
- **IP del cliente resistente a spoofing** (`core/request_ip.py` nuevo): helper
  central `get_client_ip` que cuenta saltos de proxy desde la derecha del
  `X-Forwarded-For` (Vercel = 1), en vez de confiar en el primer valor
  (controlado por el atacante). Lo usan el recall, la creación de solicitudes
  públicas y, vía `REST_FRAMEWORK["NUM_PROXIES"]`, el throttling de DRF. Nueva
  variable `DJANGO_NUM_PROXIES` (default 1).
- **FK injection cross-tenant en ServiceMaterial** (`catalog/serializers.py`):
  `ServiceMaterialSerializer` ahora usa `BusinessScopedSerializerMixin` y valida
  `validate_same_business(service, material)`. Antes un empleador podía asociar
  (y leer el costo de) materiales/servicios de otro negocio.
- **Arranque fail-secure** (`config/wsgi.py`, `config/asgi.py`,
  `config/settings.py`): los entrypoints de producción defaultean a
  `config.settings_production`; el arranque se niega a correr en Vercel con la
  `SECRET_KEY` pública de desarrollo. `manage.py` sigue en `config.settings`
  para dev/tests.
- **Uploads sin SVG/markup activo** (`config/views.py`): `validate_profile_asset_upload`
  rechaza SVG y cualquier contenido con markup activo (`<svg`, `<script`,
  `<html`…), sin confiar sólo en el `content_type` (se inspecciona el contenido),
  y aplica un límite de 5 MB. Evita XSS almacenado vía logo/avatar/documento.
- **seed_demo fail-closed** (`core/management/commands/seed_demo.py`):
  `production_like_target()` trata como productiva cualquier `DATABASE_URL` que
  no apunte a un host local (no sólo Supabase), bloqueando el sembrado de
  credenciales demo conocidas contra una DB real.

### Tests Fase 1

- `backend/tests/test_security_phase1.py`: recall sin PII, `get_client_ip`
  resistente a XFF falsificado, bloqueo de FK cross-tenant en ServiceMaterial
  (service y material) + caso válido mismo-negocio, rechazo de SVG (directo y
  disfrazado de PNG) y aceptación de PNG real, y detección fail-closed de DB no
  local en seed_demo.
- Actualizados los tests de recall en `test_public_landing_requests.py` para
  verificar la **no** exposición de PII (antes asertaban el comportamiento
  vulnerable).

## Fase 2 — Endurecimiento de auth + headers

- **Expiración absoluta del token** (`core/authentication.py` nuevo):
  `ExpiringTokenAuthentication` rechaza (y borra) tokens más viejos que
  `AUTH_TOKEN_TTL_SECONDS` (default 30 días, alineado al TTL del cliente). El
  login refresca el reloj del token. Mitiga el robo de token en localStorage
  (decisión: mitigar en sitio, no migrar a cookie). Variable
  `DJANGO_AUTH_TOKEN_TTL_SECONDS` (0 = sin expiración).
- **Invalidación de tokens en password reset** (`config/views.py`): al confirmar
  un reset se borran los tokens de API del usuario (antes un token robado seguía
  válido tras el reset).
- **Throttling por endpoint sensible** (`core/throttling.py` nuevo, activo solo
  en producción): scopes `login` (10/min), `password_reset` (5/min), `signup`
  (5/min), configurables por env. Se autodesactivan en vistas sin el scope.
- **Lockout de cuenta** (`config/views.py`): tras `DJANGO_LOGIN_LOCKOUT_THRESHOLD`
  (default 8) intentos fallidos por usuario, el login responde 429 por
  `DJANGO_LOGIN_LOCKOUT_WINDOW_SECONDS` (default 900). El login exitoso limpia el
  contador; solo cuenta credenciales inválidas (no el rechazo por negocio inactivo).
- **Headers de seguridad** (`frontend/next.config.mjs`): CSP, `X-Frame-Options:
  DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `X-DNS-Prefetch-Control`. El CSP acota `connect-src`
  (self + API) para frenar exfiltración por XSS; `frame-ancestors 'none'` contra
  clickjacking. Knobs: `NEXT_PUBLIC_CSP_DISABLED`, `NEXT_PUBLIC_CSP_CONNECT_SRC`,
  `NEXT_PUBLIC_CSP_IMG_SRC` (sin redeploy de código).
- **Validación de esquema en hrefs** (`frontend/lib/contact-links.ts`
  `safeHttpUrl`): `maps_url` (landing público) y `document_file_url` (panel de
  proveedores) solo se renderizan si son http(s); bloquea `javascript:`/`data:`.
- **Token de reset fuera de la URL** (`frontend/app/reset-password/page.tsx`):
  se limpia de la URL tras leerlo (historial/Referer). El `Referrer-Policy`
  refuerza esto.

### Tests Fase 2

- `backend/tests/test_security_phase2.py`: expiración de token (vencido se
  rechaza y borra, fresco se acepta, TTL 0 desactiva), invalidación de tokens en
  reset, lockout tras N fallos y limpieza al loguear OK.
- `frontend/lib/contact-links.test.mjs`: `safeHttpUrl` rechaza
  `javascript:`/`data:`/`vbscript:` y normaliza http(s)/relativos.
- Ajustados los asserts de `test_production_settings.py` por los nuevos throttles.
- Arreglado `test_mvp_flows.py::test_delete_canceled_reservation_with_payment_closed_cash_returns_400`:
  era no-determinista (usaba `paid_at.date()` UTC en vez de `cash_day()` local);
  fallaba cerca de la medianoche UTC. No es un cambio de comportamiento del
  producto, solo del test.

## Fase 3 — Lógica de negocio e integridad multi-tenant

- **`subscription_type` no auto-asignable** (`config/views.py`,
  `frontend`): el endpoint `/me` ya no acepta `subscription_type` (lo controla
  facturación/admin del lado servidor). En el frontend el selector "Plan interno"
  pasó a ser de solo lectura y `page.tsx` dejó de enviarlo en el PATCH de perfil.
- **Enforcement de trial detrás de feature flag** (`core/permissions.py`):
  `subscription_allows_access` + `ActiveBusinessUser` bloquean el acceso cuando el
  negocio está en TRIAL vencido, **solo** si `DJANGO_ENFORCE_SUBSCRIPTION_ACCESS=1`
  (default OFF, sin riesgo de bloquear clientes reales). Los planes pagos nunca se
  bloquean.
- **Guard de caja cerrada scopeado por negocio** (`finance/views.py`,
  `debts/views.py`, `inventory/serializers.py`): los `perform_destroy` y la
  validación de stock pasan `business=instance.business` a `ensure_cash_day_open`.
  Antes consultaban `CashClosure` global, mezclando tenants. Además
  `CashMovementViewSet.perform_destroy` usa `cash_day()` (fecha local) en vez de
  `.date()` (UTC), igual que el resto.
- **Precios/totales no negativos** (`workorders/`, `scheduling/`, `quotes/`
  serializers): se preserva la edición de precio de órdenes/reservas (intencional),
  pero se rechazan `unit_price`/`total_amount` negativos.

### Tests Fase 3

- `backend/tests/test_security_phase3.py`: `/me` no cambia `subscription_type`;
  gate de trial (off por default, bloquea TRIAL vencido con flag on, permite plan
  pago vencido y trial activo); `is_cash_day_closed` scopeado por negocio;
  rechazo de precios/totales negativos.
- Actualizados en `test_mvp_flows.py` los dos tests de `/me` + subscription_type
  para reflejar que ahora se ignora (no es 403, no persiste).
