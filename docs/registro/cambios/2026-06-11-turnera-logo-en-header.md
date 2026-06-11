# Turnera: logo del negocio en el header

## Cambio

La marca del header de la landing publica (`/publica/<slug>`) ahora muestra el logo del negocio al lado del nombre. Antes mostraba siempre la inicial del nombre (ej: "T" para The King Shine), aunque el payload ya traia `logo_url`.

Comportamiento:

- Si `business.logo_url` es una imagen utilizable, se renderiza `<img>` dentro de `.public-brand-mark`.
- Si no hay logo, si el archivo es un PDF (el backend permite subir PDF como logo) o si la imagen falla al cargar (`onError`), se cae a la inicial del nombre como antes.

## Frontend

- `frontend/app/publica/[slug]/PublicLandingClient.tsx`:
  - Reusa `isPdfAssetSource` y `safeImageAssetSource` de `@/lib/pdf-preview` (los mismos helpers que usaba el diseno anterior de la landing) para decidir si el logo es renderizable.
  - Nuevo estado `logoFailed` que se activa en `onError` del `<img>` y se resetea al recargar el landing.
  - El `<img>` va con `alt=""` (decorativo) porque el nombre del negocio esta inmediatamente al lado.
- Sin cambios de CSS: `.public-brand-mark img` ya existia en `frontend/app/styles/public.css` (display block, 100%, `object-fit: cover`) desde el diseno anterior.
- Sin cambios de backend: `logo_url` ya venia en el payload de `/public/landing/<slug>/`.

## Contexto

El commit `40118f7` (2026-06-09) habia dejado la marca con inicial a proposito ("imagen del negocio una sola vez") porque el logo se mostraba grande en otra seccion de la landing. Ese hero con imagen ya no existe en el diseno actual, asi que el logo no aparecia en ningun lado de la turnera.

## Tests

- `PublicLandingClient.test.tsx`: el test "muestra la inicial del negocio sin duplicar la imagen en la marca" (que pedia NO renderizar `<img>`) se reemplaza por cuatro casos:
  - con `logo_url` de imagen, la marca muestra el `<img>` con ese `src` y sin texto,
  - con `logo_url: null`, la marca usa la inicial,
  - con `logo_url` PDF, la marca usa la inicial,
  - si el `<img>` dispara `error`, la marca vuelve a la inicial.

## Validacion

- Typecheck: `tsc --noEmit` sin errores.
- Tests: `vitest run --maxWorkers=1` en verde.
