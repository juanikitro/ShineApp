# Beta 1C: lifecycle visible del trial

## Cambio

- El Dashboard muestra una franja de estado para negocios en prueba.
- La franja diferencia trial activo, por vencer y vencido usando los campos de
  `GET /api/auth/me/`.
- El Dashboard muestra un CTA de WhatsApp con el mensaje de continuidad
  precompletado.

## Impacto

- El dueno de negocio entiende el estado del trial sin abrir el perfil ni el
  admin.
- La beta abierta gana una salida comercial visible sin activar billing real.
- No se bloquea el negocio desde UI.
- No se agregan Stripe, checkout, portal de pagos ni migraciones.

## Validacion esperada

- Tests frontend del helper `trial-lifecycle`.
- Tests del componente `TrialLifecycleBanner`.
- Typecheck frontend.
- Regeneracion de docs/changelog.
