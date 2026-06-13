# Performance Capa 0: bundle frontend + gzip de API

## Contexto

Auditoria de performance (2026-06-12). Dos quick wins de colision nula y alto
ROI, sin tocar `page.tsx` ni componentes:

- `frontend/next.config.mjs` no tenia ninguna optimizacion de bundle: faltaba
  `experimental.optimizePackageImports`, asi que los barrels de `lucide-react`
  (75 iconos distintos) y `motion` no garantizaban trim por icono/feature.
- `frontend/public/shineapp-logo-dark.svg` (68 KB) quedo huerfano tras el
  cambio del 2026-06-08 (el generador de iconos PWA dejo de referenciarlo).
- El backend no comprime las respuestas: `MIDDLEWARE` no incluia
  `GZipMiddleware`. El frontend baja datasets completos via `apiList`
  (paginacion seguida hasta el final), por lo que los JSON viajan sin gzip.

## Cambio

- `frontend/next.config.mjs`: agregado
  `experimental.optimizePackageImports: ["lucide-react", "motion",
  "emoji-picker-react", "@dnd-kit/core"]`. No cambia API ni comportamiento.
- `frontend/public/shineapp-logo-dark.svg`: eliminado (huerfano confirmado por
  grep en todo el repo; documentado como abandonado en el cambio del
  2026-06-08). Se conserva `shineapp-logo.svg` porque sigue siendo la fuente de
  `generate-pwa-icons.mjs`.
- `backend/config/settings.py`: `django.middleware.gzip.GZipMiddleware`
  insertado despues de `SecurityMiddleware`. Comprime las respuestas dinamicas
  (JSON de DRF). WhiteNoise (prod) sigue sirviendo sus estaticos ya
  comprimidos; GZip actua sobre lo dinamico.

## Impacto esperado

- Bundle inicial mas chico (trim garantizado de iconos/feature de motion) ->
  mejor TTI/LCP.
- Respuestas de API comprimidas (gzip) -> menor transferencia y TTFB percibido,
  especialmente en secciones que bajan tablas grandes (cash, inventory).

## Nota de seguridad

GZip sobre HTTPS tiene el vector BREACH cuando la respuesta mezcla secretos con
input reflejado del atacante. La API es JSON con auth por token y no refleja
input no sanitizado junto a secretos en el mismo cuerpo; riesgo bajo. Si mas
adelante se sirve HTML con CSRF + input reflejado, mover la compresion al proxy.

## Archivos modificados

- `frontend/next.config.mjs` (optimizePackageImports)
- `frontend/public/shineapp-logo-dark.svg` (eliminado)
- `backend/config/settings.py` (GZipMiddleware)

## Validacion

- `node -e import('./frontend/next.config.mjs')`: config parsea, lista de
  optimizePackageImports correcta.
- `py -3 manage.py check`: sin issues.
- `py -3 -m pytest tests/test_healthcheck.py`: pasa (stack de middleware carga).
