# CI: superadmin de Django admin idempotente en el deploy

## Que cambio

- El workflow `deploy-vercel-demo.yml` ahora asegura el superusuario de Django admin
  despues de correr migraciones, con `python manage.py ensure_superuser`.
- El comando es idempotente: crea el usuario solo si no existe y nunca resetea el
  password de uno existente. Si existe un usuario con ese username que no es
  superusuario, no lo modifica.
- Antes el deploy nunca creaba superusers; habia que crearlos a mano contra Supabase.

## Contrato tecnico

- Comando nuevo: `core/management/commands/ensure_superuser.py`.
- Args/env: `--username`/`DJANGO_SUPERUSER_USERNAME`,
  `--password`/`DJANGO_SUPERUSER_PASSWORD`,
  `--email`/`DJANGO_SUPERUSER_EMAIL` (opcional).
- Sin username o password lanza `CommandError`.
- El step CI corre con `DJANGO_SETTINGS_MODULE=config.settings_migrations`,
  `DJANGO_MIGRATION_SECRET_KEY` y `DATABASE_URL`, igual que el step de migraciones.
- Secrets nuevos en el entorno GitHub `demo-production`:
  `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_PASSWORD` y
  `DJANGO_SUPERUSER_EMAIL` (opcional). Los dos obligatorios se validan en el step
  "Validate required GitHub secrets".

## Notas de alcance

- El superusuario creado es solo para `/admin/`: el login de la app web sigue
  bloqueando staff/superuser (`config/views.py`, `LoginView`).
- `seed_demo` se mantiene fuera del CI; este cambio no lo toca.
- Tests: `backend/tests/test_ensure_superuser.py`.
- Seguridad: el password del superadmin vive como secret de CI; rotarlo segun
  `docs/deployment/manual-steps.md` (secciones 10 y 17).
