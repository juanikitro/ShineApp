# Frontend: PWA instalable en iOS y Android (CRM y landing publica)

## Contexto

El frontend no exponia manifest ni meta tags PWA. En Android Chrome aparecia
"Agregar a pantalla de inicio" pero solo creaba un atajo; en iOS Safari el
atajo abria la web dentro del navegador en vez de comportarse como app
standalone. No habia apple-touch-icon ni configuracion de display, theme color
ni splash. El unico `public/sw.js` cubria push notifications.

## Cambio

- Nuevo `frontend/app/manifest.ts` para el CRM (`/manifest.webmanifest`)
  con `display: standalone`, `theme_color`, `background_color`, iconos `any`
  y `maskable`, y `start_url=/?source=pwa`.
- Nuevo route handler `frontend/app/publica/[slug]/manifest.webmanifest/route.ts`
  que fetchea el endpoint publico `/api/public/landing/<slug>/` (server side,
  con `revalidate: 300`) y devuelve un manifest por negocio con `name` del
  negocio, `scope=/publica/<slug>` y `start_url=/publica/<slug>?source=pwa`.
- `frontend/app/publica/[slug]/page.tsx` ahora exporta `generateMetadata`
  que vincula ese manifest dinamico, fija `applicationName` y
  `appleWebApp.title` con el nombre del negocio.
- `frontend/app/layout.tsx` agrega `viewport` (themeColor por light/dark,
  `viewportFit: cover` para notch), iconos `apple-touch-icon`, `applicationName`,
  `appleWebApp.capable` y `formatDetection.telephone=false`.
- Nuevos PNGs PWA en `frontend/public/icons/`:
  `icon-192.png`, `icon-512.png` (transparentes, logo color brand),
  `icon-maskable-192.png`, `icon-maskable-512.png` (logo blanco sobre azul
  brand con safe area 70%) y `apple-touch-icon.png` (180x180, fondo azul brand).
- Script reproducible `frontend/scripts/generate-pwa-icons.mjs` (usa sharp,
  ya disponible como dep transitiva de Next).

## Como instalar en cada plataforma

- **Android (Chrome/Edge):** entra al sitio y elige "Instalar app" en el menu
  o aceptar el banner de instalacion. Para el CRM se instala como `ShineApp`;
  para una landing publica se instala con el nombre del negocio.
- **iOS (Safari, no Chrome):** boton Compartir → "Anadir a pantalla de inicio".
  Apple solo permite agregar PWAs desde Safari; Chrome/Firefox para iPhone no
  pueden instalar PWAs. El icono y el titulo respetan el negocio en la pagina
  publica.

## Archivos modificados

- `frontend/app/manifest.ts` (nuevo)
- `frontend/app/publica/[slug]/manifest.webmanifest/route.ts` (nuevo)
- `frontend/app/publica/[slug]/page.tsx` (agrega `generateMetadata`)
- `frontend/app/layout.tsx` (metadata + viewport + icons + appleWebApp)
- `frontend/public/icons/*.png` (5 archivos nuevos)
- `frontend/scripts/generate-pwa-icons.mjs` (nuevo)

## Validacion

- `npm run build` en `frontend/` exitoso; rutas
  `/manifest.webmanifest` (static) y `/publica/[slug]/manifest.webmanifest`
  (dynamic) presentes en el reporte del build.
- Manifest CRM verificado en `.next/server/app/manifest.webmanifest.body`
  (JSON valido con iconos, scope, theme_color).
- Iconos generados con sharp e inspeccionados visualmente para contraste
  (logo blanco sobre azul brand en maskable y apple-touch).
