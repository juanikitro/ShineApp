# Frontend: iconos PWA segun superficie (CRM vs turnera)

## Contexto

Tras el setup PWA del 2026-06-05, los iconos `maskable` y `apple-touch` se
generaban desde `shineapp-logo-dark.svg` sobre fondo azul brand (logo blanco
sobre azul). En la pantalla de inicio del celular, tanto el CRM como las
turneras de cada negocio terminaban mostrando el mismo icono blanco-sobre-azul.

Pedido:
- CRM (`/`) instalado debe mostrar el logo original (light mode), no la
  variante invertida sobre el azul de marca.
- Turnera publica (`/publica/<slug>`) instalada debe mostrar el logo del
  negocio (`business.logo_url`), no el de ShineApp.

## Cambio

- `frontend/scripts/generate-pwa-icons.mjs`: ahora usa `shineapp-logo.svg`
  (light mode) como unica fuente para `any`, `maskable` y `apple-touch`.
  Los maskable y el apple-touch quedan con fondo blanco (`{r:255,g:255,b:255}`)
  para que el logo navy sea visible. Se eliminaron las referencias a
  `shineapp-logo-dark.svg` y a la constante `BRAND_COLOR`.
- PNGs regenerados en `frontend/public/icons/`: `icon-192.png`, `icon-512.png`,
  `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`.
- `frontend/app/publica/[slug]/manifest.webmanifest/route.ts`: ahora lee
  tambien `business.logo_url` del endpoint `/api/public/landing/<slug>/`.
  Si el URL apunta a una imagen soportada (`png`, `jpg`, `jpeg`, `webp`,
  `svg`, `gif`), arma el array `icons` con esa URL para los proposito `any`
  y `maskable` (`sizes: "any"` porque el tamano del asset original no esta
  controlado). Si no hay logo o el archivo es PDF u otro tipo no soportado,
  usa el set de iconos de ShineApp como fallback.
- `frontend/app/publica/[slug]/page.tsx`: `generateMetadata` ahora pide el
  logo ademas del nombre. Si hay logo image, sobrescribe `icons.apple`,
  `icons.icon` y `icons.shortcut` con esa URL para que iOS Safari use el
  logo del negocio como `apple-touch-icon` al agregar a pantalla de inicio.

## Comportamiento esperado

- **Instalar CRM en home**: aparece el icono ShineApp original (S navy sobre
  fondo blanco). Sin variantes invertidas.
- **Instalar turnera en home (Android Chrome)**: aparece el logo del negocio
  como icono (manifest dinamico). Si el negocio no subio logo o subio PDF,
  cae al icono ShineApp.
- **Instalar turnera en home (iOS Safari)**: usa `icons.apple` con el logo
  del negocio. Mismo fallback que Android.

## Archivos modificados

- `frontend/scripts/generate-pwa-icons.mjs` (logo light unico para todo)
- `frontend/public/icons/*.png` (5 archivos regenerados)
- `frontend/app/publica/[slug]/manifest.webmanifest/route.ts` (logo del negocio en `icons`)
- `frontend/app/publica/[slug]/page.tsx` (override de `icons` en metadata)

## Validacion

- `node scripts/generate-pwa-icons.mjs` en `frontend/` regenero los 5 PNGs
  sin error.
- `npm run build` en `frontend/` exitoso. Reporta `/manifest.webmanifest`
  estatica y `/publica/[slug]/manifest.webmanifest` dinamica.
- Inspeccion visual de `icon-192.png`, `icon-maskable-192.png` y
  `apple-touch-icon.png`: logo navy original sobre fondo blanco.
- Manifest CRM verificado en `.next/server/app/manifest.webmanifest.body`:
  apunta a los iconos PNG ya regenerados.
