# SECURITY_AI.md

Reglas de seguridad para cambios asistidos por IA en ShineApp.

Fuente de verdad general: `../../AGENTS.md`.

## Reglas criticas

- No hardcodear credenciales, tokens ni secretos.
- No loggear datos sensibles completos.
- Respetar permisos y autenticacion existentes por defecto.
- Validar entradas antes de operar.
- No abrir endpoints ni relajar seguridad para simplificar.

## Secretos y configuracion

Usar variables de entorno para:
- `DJANGO_SECRET_KEY`
- `POSTGRES_*`
- `EMAIL_*`
- `NEXT_PUBLIC_API_URL`

No copiar secretos reales a docs, tests o ejemplos.

## Auth y permisos

Segun `backend/config/settings.py`:
- autenticacion por token y session,
- permisos por defecto: `IsAuthenticated`.

Reglas:
- no hagas endpoints publicos por accidente,
- si un endpoint debe quedar abierto, dejarlo explicito y testearlo,
- validar permisos cuando el cambio afecte auth o admin.

## Datos sensibles

Tratar como sensibles:
- emails,
- telefonos,
- tokens,
- credenciales SMTP,
- payloads completos de login o auth.

## Frontend

- no embebas secretos en el bundle,
- solo variables `NEXT_PUBLIC_*` pueden exponerse al cliente,
- cualquier regla sensible debe seguir viviendo en backend.

## Checklist rapido

- no hardcodee secretos,
- no expuse datos sensibles,
- respete auth existente,
- valide inputs,
- no abri endpoints sin querer.
