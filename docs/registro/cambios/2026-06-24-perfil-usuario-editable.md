# Perfil: usuario editable y datos precargados

## Que cambio

- El modal "Mi perfil" ahora permite editar el nombre de usuario (campo "Usuario"), antes era de solo lectura.
- El campo "Usuario" y el resto de los datos se precargan con los valores actuales de la cuenta al abrir el modal.
- `PATCH /auth/me/` acepta `username` con validacion de unicidad (excluyendo al propio usuario); si ya existe responde 400. El cambio queda registrado en auditoria.
- Visual del bloque de avatar: la foto queda centrada horizontalmente y el texto "Toca la foto para cambiarla" alineado verticalmente debajo, en columna centrada.

## Nota

- El usuario es la credencial de login; cambiarlo cambia con que usuario se inicia sesion. La sesion actual sigue valida porque Django guarda el id, no el username.

## Archivos modificados

- `backend/config/serializers.py`
- `backend/config/views.py`
- `frontend/app/components/profile/ProfileModal.tsx`
- `frontend/app/page.tsx`
- `frontend/app/styles/shell.css`
- `frontend/lib/profile-display.ts`
- `frontend/lib/profile-display.test.mjs`
