# Arquitectura De Deploy

## Forma Del Repo

ShineApp se mantiene como un monorepo simple:

```text
repo/
  backend/   # Django + DRF API
  frontend/  # Next.js App Router
  scripts/
  docs/
```

Esto equivale a `apps/api` + `apps/web` sin el churn de mover archivos. Vercel puede crear dos proyectos desde el mismo repositorio configurando un Root Directory distinto por proyecto.

## Arquitectura Demo

- Web: proyecto Vercel `shineapp-web`, Root Directory `frontend`, framework Next.js, build command `npm run build`.
- API: proyecto Vercel `shineapp-api`, Root Directory `backend`, runtime Python, entrypoint WSGI `wsgi.py`.
- Base de datos: Supabase Postgres mediante `DATABASE_URL`. Para Vercel serverless, preferir la URL transaction pooler de Supabase.
- Media: Supabase Storage mediante la API compatible con S3. No depender del filesystem local para uploads.
- Archivos estaticos:
  - Los assets Next se buildean y sirven desde Vercel.
  - Los assets Django admin/static se recolectan con `collectstatic` y se sirven con WhiteNoise.

## Limites Serverless Aceptados Para Demo

Django en Vercel es aceptable para una demo comercial porque el trafico es bajo y la app esta orientada a request/response. No es un servidor persistente: sin uploads locales, sin jobs largos, sin workers en background y sin supuestos sobre procesos calientes.

## Produccion Paga Futura

Mantener Next.js en Vercel. Si crecen generacion de PDF, trabajo en background, volumen de uploads o presion sobre conexiones DB, mover Django a una plataforma de contenedores persistentes manteniendo Supabase Postgres y Storage. Agregar backups, observabilidad, dominios custom, rate limits y un flujo de release mas estricto antes de trafico real de produccion.
