# Beta 1A: signup publico de prueba por 14 dias

## Cambio

- El signup publico queda como entrada oficial a la beta abierta.
- La prueba creada por `POST /api/auth/trial-signup/` dura 14 dias por default.
- La duracion se puede ajustar con `DJANGO_TRIAL_SIGNUP_DAYS`.
- La UI de login comunica prueba gratuita por 14 dias y mantiene alta directa sin tarjeta.
- El email de bienvenida informa la duracion de la prueba.

## Impacto

- Cualquier negocio puede pedir una prueba libre sin invitacion previa.
- El alta sigue creando un negocio real vacio con usuario empleador, sectores y horarios base.
- No se agrega billing ni cobro automatico.
- No se agregan migraciones ni cambios de esquema.

## Validacion esperada

- Tests backend puntuales de trial signup.
- Tests frontend puntuales de auth/login si aplica.
- Regeneracion de docs/changelog.
