# Turnera: el logo del header entra completo, sin recorte cuadrado

## Cambio

Ajuste sobre el logo del header de la landing publica (`/publica/<slug>`) introducido hoy: la imagen ahora se muestra completa, conservando su proporcion. Antes la marca forzaba un cuadrado de 36px con `object-fit: cover`, que recortaba logos no cuadrados.

Comportamiento con logo:

- La marca pierde el fondo rojo, el radio y el ancho fijo: queda solo la imagen, alto 36px, ancho automatico (tope 140px para logos muy anchos), `object-fit: contain`.
- El fallback sin logo (inicial del nombre en cuadrado rojo) queda exactamente igual.

## Frontend

- `frontend/app/styles/public.css`: nueva variante `.public-brand-mark--logo` (background transparente, sin radius, `width: auto`, `max-width: 140px`); `.public-brand-mark img` pasa de `cover`/100% a `contain` con `width: auto` y `max-width: 100%`.
- `frontend/app/publica/[slug]/PublicLandingClient.tsx`: la marca aplica la variante con `cx('public-brand-mark', brandLogoSrc && 'public-brand-mark--logo')`.

## Tests

- `PublicLandingClient.test.tsx`: los casos de logo/fallback/imagen rota ahora tambien verifican que la clase `public-brand-mark--logo` este presente solo cuando se renderiza la imagen.

## Validacion

- Typecheck: `tsc --noEmit` sin errores.
- Tests: `vitest run --maxWorkers=1` en verde.
- Build: `next build` OK.
