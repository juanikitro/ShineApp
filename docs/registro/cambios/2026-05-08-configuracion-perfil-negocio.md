# Configuracion con perfil del negocio

## Cambio

`Configuracion` ahora incluye un panel `Negocio` con datos comerciales persistentes:

- nombre
- imagen/logo
- CUIT
- condicion frente a IVA
- celular de contacto
- mail de contacto
- El logo se cambia clickeando directamente sobre el preview visible; el input de archivo deja de mostrarse como control separado.

El logo se sube desde la app y se guarda en el backend usando media persistida.

## Contrato tecnico

- Nuevo endpoint employer-only: `GET/PATCH /api/settings/business-profile/`
- Modelo singleton: `core.BusinessProfile`
- Upload: `multipart/form-data`
- Soporte media local: `MEDIA_ROOT`, `MEDIA_URL` y volumen `media_data` en `docker-compose.yml`

## Validacion esperada

- El panel muestra preview del logo actual o del archivo nuevo antes de guardar.
- El CUIT se normaliza a 11 digitos.
- La condicion frente a IVA se elige desde un selector cerrado.
- Un usuario `empleado` no puede consultar ni modificar este perfil.
