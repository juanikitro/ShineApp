# Beta 1B - Guardrails operativos de trials

## Objetivo

Dar soporte operativo al signup publico de 14 dias sin introducir billing real
ni bloquear usuarios por default. La beta abierta necesita trazabilidad,
visibilidad y acciones manuales seguras para operar negocios trial.

## Alcance

- Registrar cada alta publica como evento `trial_signup` en `AuditLog`.
- Asociar el audit al negocio creado y guardar solo metadata no sensible.
- Mejorar Django admin como consola interna inicial:
  - filtros por estado de trial;
  - columnas de estado, dias restantes y owner;
  - accion para extender trials 7 dias;
  - accion para suspender negocios con trial vencido.
- Mantener `DJANGO_ENFORCE_SUBSCRIPTION_ACCESS=0` por default.

## Fuera de alcance

- Stripe, checkout, portal de facturacion o planes pagos reales.
- Bloqueo automatico de trials vencidos.
- Limpieza masiva o borrado automatico de negocios.
- Nueva UI interna fuera de Django admin.

## Seguridad

El audit no debe guardar passwords, tokens ni payload completo del signup. La
suspension usa `BusinessAccount.deactivate(...)`, que ya desactiva el negocio e
invalida tokens de usuarios asociados.

## Validacion

- Tests de signup auditado.
- Tests de acciones admin para extender y suspender solo negocios elegibles.
- `manage.py check` y docs-check.
