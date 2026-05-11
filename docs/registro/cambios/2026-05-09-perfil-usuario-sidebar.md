# Perfil de usuario en sidebar y `auth/me/` enriquecido

## Que cambio

- El footer del sidebar ahora muestra el usuario actual con avatar y nombre.
- El cierre de sesion deja de estar visible en el sidebar y pasa al popup de perfil.
- El popup de perfil permite ver datos del usuario actual y editar:
  - foto de perfil,
  - email,
  - caracteristica pais del celular,
  - numero celular.
- La foto de perfil del popup se cambia clickeando directamente sobre el preview visible; el input de archivo deja de mostrarse como control separado.
- El tipo de suscripcion de la cuenta (`trial` o `premium`) se muestra en el popup para todos los usuarios y solo el empleador puede modificarlo.

## Contrato tecnico

- `GET /api/auth/me/` y la respuesta de `POST /api/auth/login/` ahora incluyen:
  - `is_active`,
  - `date_joined`,
  - `last_login`,
  - `avatar_url`,
  - `phone_country_code`,
  - `phone_number`,
  - `phone_display`,
  - `subscription_type`,
  - `subscription_type_label`.
- `PATCH /api/auth/me/` permite actualizar perfil propio con `multipart/form-data` o JSON.
- La suscripcion se guarda a nivel cuenta en `BusinessProfile`.
- Los datos personales del usuario se guardan en `UserProfile`.

## Notas de alcance

- No se amplio el alta de empleados en esta iteracion.
- No se agrego borrado explicito de avatar en v1.
- La lista de pais para celular se limito a una seleccion corta LATAM con `+54` por defecto.
