# Frontend: favicon del navegador en la turnera usa el logo del negocio

## Contexto

El 2026-06-08 se hizo que la turnera publica (`/publica/<slug>`) usara el logo
del negocio como icono PWA y apple-touch-icon via `generateMetadata`
(`icons.icon`, `icons.apple`, `icons.shortcut`).

Problema: en la pestana del navegador (favicon ICO) la turnera seguia mostrando
el icono de ShineApp, no el del negocio. Causa: `frontend/app/favicon.ico` es
una convencion de archivo raiz de Next App Router. Next inyecta
`<link rel="icon" href="/favicon.ico" sizes="any">` en **todas** las rutas,
incluida la turnera, y ese link gana sobre los `icons` por config que define
`generateMetadata`. Las convenciones de archivo no se pueden suprimir por
segmento.

## Cambio

- Mover `frontend/app/favicon.ico` -> `frontend/public/favicon.ico`. Al salir de
  `app/`, Next deja de inyectar el `<link rel="icon" href="/favicon.ico">`
  global, asi que el favicon de cada ruta queda determinado por los `icons`
  basados en config (que si se sobreescriben por segmento). `/favicon.ico`
  sigue sirviendose desde `public/` (lo usa `public/sw.js` para el icono de
  notificaciones y lo piden los navegadores por defecto).
- `frontend/app/layout.tsx`: agregar `{ url: '/favicon.ico', sizes: 'any' }` al
  inicio de `metadata.icons.icon` para que el CRM (`/`) y demas rutas mantengan
  el favicon ICO de ShineApp de forma explicita y, al ser config, sea
  sobreescribible por la turnera.

## Comportamiento esperado

- **Pestana de la turnera (`/publica/<slug>`)**: favicon = logo del negocio
  cuando `business.logo_url` es imagen soportada. Si no hay logo o es PDF,
  hereda el favicon ShineApp del root layout (fallback, sin `icons` propios).
- **Pestana del CRM (`/`) y resto**: favicon ShineApp (ICO + PNG 192/512).
- `/favicon.ico` sigue resolviendo (sw.js y peticion implicita del navegador).

## Archivos modificados

- `frontend/app/favicon.ico` -> `frontend/public/favicon.ico` (movido)
- `frontend/app/layout.tsx` (favicon.ico explicito en `metadata.icons.icon`)

## Validacion

- No se ejecutaron tests/build: el worktree no tiene `node_modules` instalado
  (install pesado). El cambio es un movimiento de archivo mas 3 lineas
  aditivas de config; no agrega logica. Los tests de `app/publica/[slug]/page.test.ts`
  asertan sobre el objeto devuelto por `generateMetadata`, que no se modifico.
- Comandos recomendados para confirmar en entorno con deps:
  `cd frontend; npm run test` y `npm run build`.
