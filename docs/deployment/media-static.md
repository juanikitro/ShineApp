# Media And Static Files

## Media

Persistent uploads must use Supabase Storage in demo/prod. Local filesystem media is only for local development.

Current upload fields:

- `core.BusinessProfile.logo`
- `core.UserProfile.avatar`
- `inventory.StockMovement.document_file`

The quote PDF generator reads the business logo through the Django `FileField` API, so it works with both local storage and remote S3-compatible storage.

## Django static files

Production settings use WhiteNoise:

- `collectstatic` writes assets to `backend/staticfiles`.
- `STORAGES["staticfiles"]` uses `CompressedManifestStaticFilesStorage`.
- Vercel build runs `python manage.py collectstatic --noinput`.

## Next static assets

Next.js assets under `frontend/public` and build output are handled by Vercel's Next.js build.

## Local development

`config.settings` keeps local media under `backend/media` and serves it only when `DEBUG=True`. Do not treat that folder as persistent production storage.
