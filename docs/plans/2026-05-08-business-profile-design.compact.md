# Perfil de negocio en Configuracion

## Objetivo

Sumar a `Configuracion` perfil unico negocio, datos comerciales editables app:

- nombre
- imagen/logo
- CUIT
- condicion frente a IVA
- celular de contacto
- mail de contacto

## Diseno

- Backend:
  - `core.BusinessProfile` singleton operativo.
  - Endpoint employer-only `GET/PATCH /api/settings/business-profile/`.
  - Update con `multipart/form-data` para logo subido desde app.
  - `MEDIA_ROOT` y `MEDIA_URL` en Django, volumen `media_data` en Compose para no perder archivo al recrear contenedores.
- Frontend:
  - Bloque nuevo `Negocio` dentro de `Configuracion`.
  - Preview imagen actual o pendiente de guardar.
  - Selector cerrado para `condicion frente a IVA`.
  - Guardado con `FormData`.

## Trade-offs

- Usa `FileField` no `ImageField`: evita dependencias nativas solo para validar imagen.
- Perfil unico por instalacion; no multi-sucursal ni multiples logos.
- Esta pasada: reemplazo imagen, no versionado ni edicion avanzada.

## Validacion esperada

- Empleador lee y edita perfil.
- Empleado recibe `403`.
- Logo servido desde `/media/` y persiste con Docker Compose.
