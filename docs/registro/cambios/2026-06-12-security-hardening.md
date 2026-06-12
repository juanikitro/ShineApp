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
