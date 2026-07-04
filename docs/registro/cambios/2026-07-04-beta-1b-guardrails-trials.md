# Beta 1B: guardrails operativos para trials publicos

## Cambio

- El signup publico registra un `AuditLog` `trial_signup` vinculado al negocio.
- La metadata del audit incluye dominio de email, duracion del trial y origen
  `public_signup`, sin passwords ni tokens.
- Django admin suma columnas y filtros para operar trials: estado, dias
  restantes, owner y negocio activo.
- Django admin permite extender trials seleccionados 7 dias.
- Django admin permite suspender negocios con trial vencido, invalidando sus
  tokens mediante el flujo existente de desactivacion.

## Impacto

- La beta abierta gana trazabilidad y operacion basica sin consultar la DB a mano.
- No se activa billing, Stripe ni portal de pagos.
- No se cambia el default de `DJANGO_ENFORCE_SUBSCRIPTION_ACCESS`; los trials
  vencidos siguen sin bloquearse globalmente salvo decision explicita.
- El throttling de signup sigue configurable por `DJANGO_THROTTLE_SIGNUP_RATE`
  en produccion.

## Validacion esperada

- Tests backend puntuales de trial signup y admin multitenant.
- `manage.py check`.
- Regeneracion de docs/changelog.
