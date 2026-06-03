# Avatar editable en el popup de perfil

## Contexto

`docs/registro/cambios/2026-05-09-perfil-usuario-sidebar.md` decia que el popup "Mi perfil" permitia cambiar la foto clickeando el preview, pero la UI nunca tuvo el control: `ProfileModal` no renderizaba preview ni input, `blankProfileForm` no incluia avatar y `saveProfile` no adjuntaba el archivo. El avatar solo se mostraba de solo-lectura en el footer del sidebar.

El backend ya soportaba la subida: `PATCH /api/auth/me/` acepta el campo multipart `avatar` (`MeUpdateSerializer.avatar`, validado por `validate_profile_asset_upload`) y tiene tests para PNG y PDF en `backend/tests/test_mvp_flows.py`. El hueco era 100% frontend.

## Cambios

**Frontend** — se cablea la edicion de avatar en el formulario de perfil, sin tocar el contrato de la API.

- `frontend/app/components/profile/ProfileModal.tsx`: agrega un preview circular clickeable + input de archivo oculto arriba del formulario. Click sobre el preview abre el selector; muestra imagen seleccionada, avatar guardado, miniatura de PDF, icono PDF o inicial del usuario; badge de camara y leyenda "Toca la foto para cambiarla/agregarla". Mismo `accept` que el logo del negocio.
- `frontend/app/page.tsx`: estado/refs `profileAvatar*`, handlers `handleProfileAvatarChange` / `openProfileAvatarPicker`, preview con object URL y limpieza (`revokeProfileAvatarObjectUrl` en unmount), reset al abrir el modal y al cambiar `currentUser` (refleja el avatar recien guardado), y `saveProfile` agrega `avatar` al `FormData` solo si hay archivo elegido. Reusa `isPdfFile`, `isPdfAssetSource`, `usePdfThumbnailPreview` y `safeImageAssetSource`.
- `frontend/app/styles/shell.css`: clases `profile-avatar-block`, `profile-avatar-preview`, `profile-avatar-overlay`, `profile-avatar-hint` con tokens semanticos (claro/oscuro); reusa `.visually-hidden-input`.

## Contrato tecnico

- Sin cambios de API. Se sigue usando `PATCH /api/auth/me/` con `multipart/form-data` y campo `avatar`.

## Archivos modificados

- `frontend/app/components/profile/ProfileModal.tsx`
- `frontend/app/page.tsx`
- `frontend/app/styles/shell.css`

## Validacion

- `tsc --noEmit` OK (sin errores de tipos).
- Frontend tests: `vitest run` 278/278 (31 archivos).
- Frontend build: `next build` OK.
- node_modules no esta instalado en el worktree; se valido via junction temporal al `node_modules` del repo principal.

## Notas de alcance

- No se agrego borrado explicito de avatar (consistente con la nota v1).
- El alta de empleados (`SettingsWorkspace`) no cambia: sigue sin avatar.
