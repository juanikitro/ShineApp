# Media Y Archivos Estaticos

## Media

Los uploads persistentes deben usar Supabase Storage en demo/prod. Media en filesystem local es solo para desarrollo local.

Campos actuales de upload:

- `core.BusinessProfile.logo`
- `core.UserProfile.avatar`
- `inventory.StockMovement.document_file`

El generador de PDF de cotizaciones lee el logo del negocio mediante la API `FileField` de Django, asi que funciona tanto con storage local como con storage remoto compatible con S3.

## Archivos Estaticos De Django

Settings de produccion usa WhiteNoise:

- `collectstatic` escribe assets en `backend/staticfiles`.
- `STORAGES["staticfiles"]` usa `CompressedManifestStaticFilesStorage`.
- El build de Vercel ejecuta `python manage.py collectstatic --noinput`.

## Assets Estaticos De Next

Los assets Next.js bajo `frontend/public` y el output de build son manejados por el build Next.js de Vercel.

## Desarrollo Local

`config.settings` mantiene media local bajo `backend/media` y la sirve solo cuando `DEBUG=True`. No tratar esa carpeta como storage persistente de produccion.
