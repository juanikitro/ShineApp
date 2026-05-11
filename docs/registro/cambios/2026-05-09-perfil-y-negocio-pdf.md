# Perfil y negocio aceptan PDF

## Cambio

Los uploads de foto de perfil y logo/imagen del negocio ahora aceptan archivos `.pdf` ademas de imagenes.

## Impacto

- Backend: `PATCH /api/auth/me/` y `PATCH /api/settings/business-profile/` aceptan `application/pdf` y extension `.pdf`.
- Frontend: los selectores de archivo permiten PDF y la UI genera un preview rasterizado de la primera pagina para el logo del negocio y los avatares PDF visibles.
- UX: cuando el archivo actual o nuevo es PDF, la app intenta mostrar la primera pagina como imagen; si no puede, cae a un estado seguro sin romper la superficie.

## Validacion esperada

- Un empleador puede guardar avatar PDF.
- Un empleador puede guardar logo del negocio en PDF.
- La barra lateral, el modal de perfil y la tarjeta de negocio no muestran imagen rota si el archivo cargado es PDF.
