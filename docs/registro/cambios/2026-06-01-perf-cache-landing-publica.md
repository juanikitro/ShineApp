# Performance: cache de edge en la landing publica

## Problema

Hipotesis de caché ausente (no hay `CACHES`). La mayoria de los endpoints son
autenticados y por-negocio: cachearlos arriesga servir datos viejos tras una
mutacion o filtrar datos entre negocios. El unico endpoint claramente cacheable
sin riesgo es la landing publica (`GET /api/public/landing/<slug>/`): sin auth,
solo lectura, datos publicos de baja frecuencia de cambio.

## Cambio

- Backend `notifications/views.py` (`PublicLandingView.get`): agrega
  `Cache-Control: public, s-maxage=120, stale-while-revalidate=600` a la respuesta
  200. El edge de Vercel puede servir desde cache (no hay datos por-usuario).
- Frontend `lib/api.ts` (`publicApiFetch`): respeta `options.cache` (default sigue
  `no-store`). `apiFetch` autenticado NO cambia: sigue `no-store` (datos sensibles).
- Frontend `PublicLandingClient.tsx`: el GET de la landing usa `{ cache: 'default' }`
  para aprovechar el cache HTTP/edge. El POST de solicitudes sigue sin cache.

## Por que es seguro

- Solo se cachea contenido publico (sin token, sin sesion, sin datos por-usuario).
- `public` + `s-maxage` aplica a cache compartido (CDN); no expone datos privados.
- Staleness acotada (120 s fresco, hasta 600 s revalidando en background). Para una
  landing de marketing es aceptable.
- Datos operativos/financieros (dashboard, caja, trabajos, etc.) quedan SIN cache.

## Validacion

- Backend: `pytest tests/test_public_landing_requests.py` (8 passed). El test
  `test_public_landing_is_available_without_auth_and_hides_prices` ahora verifica
  `Cache-Control` con `public` y `s-maxage`.
- Frontend: `npm run test -- lib/api.test.mjs` (13 passed). Nuevo caso: `publicApiFetch`
  usa `no-store` por defecto y respeta un `cache` explicito.

## Impacto esperado (pendiente de medir post-deploy)

- Hits anonimos repetidos a la landing servidos desde el edge (sin tocar funcion ni
  DB). El beneficio escala con el trafico publico de la landing.
- Cero impacto en flujos autenticados.
