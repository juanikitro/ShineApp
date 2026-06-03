# Fix: imagenes de storage (logo, avatar) no se ven en Vercel

## Contexto

En el entorno Vercel/demo, las imagenes de assets subidos a Supabase Storage (logo del negocio, avatar de usuario) no se renderizaban. La URL del `src` del `<img>` contenia `%252F` en el parametro `X-Amz-Credential`, y S3 rechazaba la request con `InvalidSignature`. En cotizaciones PDF funcionaba correctamente porque el PDF lee los bytes del archivo directamente sin pasar la URL al browser.

## Causa raiz

El frontend envolvia el `src` del `<img>` con `encodeURI()`. La funcion `encodeURI` codifica el caracter `%` a `%25`, convirtiendo las secuencias ya codificadas de las URLs pre-firmadas (`%2F` → `%252F`). Las URLs pre-firmadas de Supabase S3 incluyen `/` codificados como `%2F` en el parametro `X-Amz-Credential`, y al quedar doble-codificados la firma se invalida.

## Cambios

**Frontend** — removido `encodeURI()` de todos los atributos `src` de imagenes de storage:
- `frontend/app/components/settings/BusinessSettingsPanel.tsx` — logo del negocio y su PDF thumbnail
- `frontend/app/page.tsx` — avatar del usuario en sidebar y su PDF thumbnail

`safeImageAssetSource` ya valida que la URL tenga protocolo seguro (http/https/blob), asi que `encodeURI` no aportaba seguridad adicional.

**Frontend** — `PublicLandingClient.tsx` aplica `safeImageAssetSource` a `businessImageSource` para consistencia con el resto del frontend.

**Backend** — `file_url()` en `core/permissions.py` retorna directo cuando la URL ya es absoluta (storage externo como Supabase), evitando procesar innecesariamente la URL a traves de `build_absolute_uri`. `get_logo_url` en `config/views.py` y `get_document_file_url` en `inventory/serializers.py` refactorizados para reusar `file_url()`.

## Archivos modificados

- `frontend/app/components/settings/BusinessSettingsPanel.tsx`
- `frontend/app/page.tsx`
- `frontend/app/publica/[slug]/PublicLandingClient.tsx`
- `backend/core/permissions.py`
- `backend/config/views.py`
- `backend/inventory/serializers.py`

## Validacion

- Backend: 230 tests pasan (incluye `test_business_profile`, `test_mvp_flows`, `test_stock_movements`, `test_core_infrastructure`).
- Frontend: tests pendientes al mergear a main (dev server activo impide ejecutar Vitest en el worktree).
