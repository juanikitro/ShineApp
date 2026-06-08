# Fix: cambios en Configuracion revierten visualmente tras guardar

## Contexto

Al modificar cualquier campo en Configuracion (datos del negocio, defaults de cotizacion, flags de agenda, etc.) y guardar, el toast "Configuracion guardada" aparece pero el formulario muchas veces revierte al valor anterior. La operacion en el backend si quedo guardada; solo la UI muestra el valor viejo hasta refrescar.

El sintoma es intermitente: dentro de los primeros 5 minutos despues del primer fetch del perfil suele aparecer; pasado ese tiempo, los siguientes guardados se ven bien.

## Causa raiz

El commit `446ea96` ("perf(cache): Cache-Control en /auth/me/ y business-profile/") agrego:

- Backend `BusinessProfileView.get`: `patch_cache_control(response, private=True, max_age=300)`.
- Backend `MeView.get`: `patch_cache_control(response, private=True, max_age=60)`.
- Frontend: los call sites correspondientes pasaban `{ cache: 'default' }` para respetar ese Cache-Control.

El flujo de guardado en `runAction` (`frontend/app/page.tsx`) es:

1. `PATCH /settings/business-profile/` con los nuevos valores.
2. `syncBusinessProfile(saved)` -> el form muestra los valores nuevos.
3. `loadData({ force: true })` -> re-GET a `/settings/business-profile/`.
4. `syncBusinessProfile(perfil)` -> el form muestra lo que devolvio el GET.

Con `cache: 'default'` + `Cache-Control: private, max-age=300`, el paso 3 lo sirve el cache HTTP del browser con la respuesta vieja (la que se cacheo al entrar a la pagina, antes del PATCH). El paso 4 entonces pisa el form con valores pre-guardado, dejando la sensacion de "no se guardo".

El mismo patron quedo presente en `/auth/me/` (max_age=60). En la practica `/auth/me/` no se re-pide despues de un PATCH desde `saveProfile` (que setea `currentUser` directo desde la respuesta), pero el riesgo latente esta: cualquier futuro refetch dentro de la ventana de 60 segundos serviria datos viejos.

`force: true` en `loadData` solo limpia el cache en memoria de la app (`loadedDataCacheRef`); no bypassea el cache HTTP del browser.

El propio commit `446ea96` documentaba que `/services/` y `/materials/` se dejaban fuera porque "la invalidacion automatica de cache via misma URL POST/PATCH no es confiable en fetch API". La misma logica aplica al business-profile (mutable desde Settings) y a `/auth/me/` (mutable desde Perfil).

## Cambios

- `frontend/lib/app-data.ts`: `case 'businessProfile'` ya no pasa `cache: 'default'`. Hereda el default `no-store` de `apiFetch`.
- `frontend/app/page.tsx`: bootstrap de `/auth/me/` ya no pasa `cache: 'default'`.
- `backend/config/views.py`: removido `patch_cache_control` de `MeView.get` y `BusinessProfileView.get`, mas el import ya no usado.

Sin el opt-in en el cliente los headers de cache eran inocuos hoy, pero un proximo cambio que opte un fetch a `default` reintroduciria el bug. Quitar ambos lados mantiene la regla consistente con el resto de la API (todo `no-store` por defecto en `apiFetch`).

## Archivos modificados

- `frontend/lib/app-data.ts`
- `frontend/app/page.tsx`
- `backend/config/views.py`

## Validacion

- Backend: `cd backend && .\.venv\Scripts\python.exe -m pytest` (suite completa, sin tests acoplados a Cache-Control).
- Frontend: `cd frontend && npm run test` y `npm run build`.
- Manual: en Configuracion / Negocio cambiar Nombre, guardar y confirmar que el valor persiste tras el toast sin necesidad de refrescar la pagina.

## Prevencion

Para endpoints autenticados que se pueden mutar desde la app, dejar el default `no-store` de `apiFetch`. Si en el futuro hace falta cacheo para perf, evaluarlo con un mecanismo de invalidacion explicito (por ejemplo, sumar `cache: 'reload'` al GET disparado desde `runAction`) y no apoyarse en el Cache-Control del backend.
