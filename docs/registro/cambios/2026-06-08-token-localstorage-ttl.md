# Sesion persistente con TTL configurable

## Cambio

El token de autenticacion del frontend vuelve a `localStorage` pero con expiracion explicita. Antes vivia en `sessionStorage` y se perdia al cerrar la pestaña, lo que obligaba a re-loguearse cada visita (notorio en el entorno demo).

Ahora `setStoredToken` guarda `{ token, expiresAt }` en `localStorage`. `getStoredToken` valida el `expiresAt` antes de devolver el token y limpia la entrada cuando expira. El TTL se controla con la variable publica `NEXT_PUBLIC_SHINEAPP_TOKEN_TTL_DAYS` (default `30` dias).

## Archivos

- `frontend/lib/api.ts`: nueva forma JSON con `expiresAt`, lectura del env, migracion desde formatos legacy y limpieza al expirar.
- `frontend/lib/api.test.mjs`: cobertura del TTL por default, override por env, fallback ante valor invalido, expiracion, migracion legacy (`sessionStorage` y `localStorage` raw) y descarte de JSON corrupto.
- `frontend/Dockerfile`: propaga `NEXT_PUBLIC_SHINEAPP_TOKEN_TTL_DAYS` como build arg/env.
- `.env.example`: agrega `NEXT_PUBLIC_SHINEAPP_TOKEN_TTL_DAYS=30`.
- `docs/deployment/env-vars.md`: documenta la nueva variable.

## Migracion

Sesiones existentes no se invalidan. `getStoredToken` detecta tokens crudos en `sessionStorage` (formato post `2e80472`) o en `localStorage` (pre `2e80472`), los reescribe en el nuevo formato con TTL fresco y borra el rastro legacy. JSON corrupto o desconocido se descarta para forzar re-login limpio.

## Seguridad

Compromiso consciente: `localStorage` es accesible por XSS, a diferencia de `sessionStorage`. La variable es publica (bundleada en el browser), no expone secretos. El backend DRF no cambia: el token sigue sin TTL server-side, asi que la expiracion vive solo en el cliente. Quien necesite revocacion forzada debe rotar el token en backend (futuro).

Recomendacion operativa: dejar `30` en demo y revisar el valor cuando se documente la politica de sesion en produccion.

## Criterio

Se prioriza UX en demo y uso diario sin volver al comportamiento "infinito" anterior al hardening del `2e80472`. El TTL acotado mantiene la sesion finita y configurable por entorno, en lugar de un endurecimiento global de `sessionStorage`.
