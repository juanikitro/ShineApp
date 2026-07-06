# Beta 1D - Seguimiento manual interno de trials

## Objetivo

Dar al equipo interno una forma simple de seguir trials publicos sin crear una
beta cerrada, billing real ni automatizaciones de contacto. El usuario final
sigue viendo solo la experiencia de prueba de 14 dias y el banner de lifecycle.

## Decision

Guardar el seguimiento comercial sobre `BusinessProfile` y exponerlo en Django
admin mediante un modelo proxy `TrialFollowUp`. Esto mantiene una unica fuente
de datos para negocio/trial y crea una seccion operativa separada llamada
`Seguimiento de trials`.

## UX interna

- `Perfiles de negocio` muestra el estado de seguimiento junto al estado del
  trial.
- `Negocios` permite filtrar por seguimiento desde la lista general.
- `Seguimiento de trials` lista solo perfiles `trial`.
- El operador puede editar estado y proximo seguimiento desde la grilla.
- Acciones masivas marcan trials como nuevo, contactado, demo agendada,
  convertido o perdido.
- `Convertido` es solo estado comercial interno; no cambia `subscription_type`
  ni activa billing.

## Fuera de alcance

- Enviar emails, WhatsApp o recordatorios automaticos.
- Stripe, checkout, portal de pagos o planes reales.
- Cambiar bloqueo de trials vencidos.
- Exponer notas comerciales en API o frontend cliente.

## Seguridad y datos

El seguimiento queda restringido al Django admin existente. No se agregan
endpoints publicos ni se exponen notas, telefonos o emails nuevos al frontend.
Las acciones admin no deben modificar el plan del negocio ni suspender cuentas.

## Validacion

- Tests de signup para defaults de seguimiento.
- Tests admin del proxy y acciones de seguimiento.
- Check de migraciones y `manage.py check`.
- Docs-check con indices/changelog regenerados.
