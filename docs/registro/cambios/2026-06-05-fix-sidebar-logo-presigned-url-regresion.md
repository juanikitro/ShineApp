# Fix: regresion del logo de negocio en el sidebar (presigned URL)

## Contexto

El logo del negocio en el footer del sidebar volvio a romperse en Vercel/demo: la imagen no carga y la URL del `src` aparece con `%252F` en el parametro `X-Amz-Credential` mientras que la misma URL renderiza bien en el panel de Configuracion.

Reproduccion concreta:
- Configuracion (funciona): `...X-Amz-Credential=...%2F20260605%2Fsa-east-1%2Fs3%2Faws4_request...`
- Sidebar (rompe): `...X-Amz-Credential=...%252F20260605%252Fsa-east-1%252Fs3%252Faws4_request...` -> Supabase responde `InvalidSignature`.

## Causa raiz

Misma raiz que el fix [2026-06-03-fix-logo-presigned-url](2026-06-03-fix-logo-presigned-url.md): envolver el `src` con `encodeURI()` codifica el `%` a `%25` y duplica las secuencias ya codificadas (`%2F` -> `%252F`) de las URLs pre-firmadas de Supabase S3.

La regresion entro con el commit `177b60c` ("fix(ui): mostrar solo el logo del negocio a ancho completo en el sidebar"): al consolidar las dos ramas del condicional (`safeBusinessLogoPreview` / `safeBusinessLogoPdfThumbnail`) en un unico `<img>` con la nueva derivacion `sidebarBusinessLogoSrc`, se arrastro el `encodeURI()` que ya habia sido removido del resto del frontend.

## Cambios

- `frontend/app/page.tsx`: remover `encodeURI(sidebarBusinessLogoSrc)` y usar `sidebarBusinessLogoSrc` directo en el `src` de la tarjeta de negocio del sidebar.

`safeImageAssetSource` ya normaliza la URL via `new URL().href` (preserva las secuencias `%xx` correctas) y valida protocolo seguro, asi que el `encodeURI` no aporta nada y solo rompe firmas.

## Archivos modificados

- `frontend/app/page.tsx`

## Validacion

- Typecheck frontend: `tsc --noEmit` sin errores.
- Tests frontend: `vitest run app/components/layout/layout.test.tsx` (4 passed).
- Verificacion manual: abrir la app con un negocio que tenga `logo_url` apuntando a Supabase Storage y confirmar que el logo del sidebar carga sin error en la consola de red.

## Prevencion

Cualquier nuevo `<img>` que muestre assets de storage (logo, avatar, PDF thumbnails) debe usar directo el resultado de `safeImageAssetSource` (o derivado). No envolver con `encodeURI()` URLs absolutas: pre-firmas, query strings y reservados ya estan codificados aguas arriba.
