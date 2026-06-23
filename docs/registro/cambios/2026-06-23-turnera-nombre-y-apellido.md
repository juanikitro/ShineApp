# Turnera: el formulario publico pide nombre y apellido

## Cambio

En la landing publica de la turnera, el campo principal del cliente deja de mostrar `Nombre` y pasa a mostrar `Nombre y apellido`.

## Frontend

- `frontend/app/publica/[slug]/PublicLandingClient.tsx`: se actualiza el label visible del input `customer_name` sin cambiar el payload ni la logica del formulario.
- `frontend/app/publica/[slug]/PublicLandingClient.test.tsx`: los tests pasan a buscar el nuevo texto accesible del campo.

## Validacion

- No se ejecutaron tests ni build en este cambio puntual de copy.

## Notas

- No cambia contratos de API, validaciones ni nombres de campos enviados al backend.
