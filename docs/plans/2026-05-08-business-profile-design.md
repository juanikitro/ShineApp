# Perfil de negocio en Configuracion

## Objetivo

Agregar al panel `Configuracion` un perfil unico del negocio con datos comerciales editables desde la app:

- nombre
- imagen/logo
- CUIT
- condicion frente a IVA
- celular de contacto
- mail de contacto

## Diseno

- Backend:
  - `core.BusinessProfile` como singleton operativo.
  - Endpoint employer-only `GET/PATCH /api/settings/business-profile/`.
  - Actualizacion con `multipart/form-data` para soportar logo subido desde la app.
  - `MEDIA_ROOT` y `MEDIA_URL` en Django, con volumen `media_data` en Compose para no perder el archivo al recrear contenedores.
- Frontend:
  - Nuevo bloque `Negocio` dentro de `Configuracion`.
  - Preview de la imagen actual o pendiente de guardar.
  - Selector cerrado para `condicion frente a IVA`.
  - Guardado con `FormData`.

## Trade-offs

- Se usa `FileField` en vez de `ImageField` para evitar sumar dependencias nativas solo para validar imagen.
- El perfil es unico por instalacion; no se modela multi-sucursal ni multiples logos.
- En esta pasada se soporta reemplazo de imagen, no versionado ni edicion avanzada.

## Validacion esperada

- Un empleador puede leer y editar el perfil.
- Un empleado recibe `403`.
- El logo queda servido desde `/media/` y persiste con Docker Compose.
