# Beta 1D: seguimiento manual interno de trials

## Cambio

- `BusinessProfile` guarda estado, ultimo contacto, proximo seguimiento y notas
  internas de seguimiento comercial.
- Django admin suma una seccion `Seguimiento de trials` basada en un modelo
  proxy que lista solo negocios en prueba.
- El admin permite filtrar por estado comercial, proximo seguimiento y estado
  del trial.
- El operador puede marcar trials como nuevo, contactado, demo agendada,
  convertido o perdido.
- `Negocios` y `Perfiles de negocio` muestran el estado de seguimiento para
  evitar consultar la base a mano.

## Impacto

- La beta abierta tiene seguimiento comercial manual sin automatizaciones.
- El cliente no ve notas internas ni cambios nuevos en API/frontend.
- Marcar un trial como `Convertido` no cambia `subscription_type`, no activa
  billing y no suspende el negocio.

## Validacion esperada

- Tests backend de signup y admin multitenant.
- `manage.py check`.
- Check de migraciones.
- Regeneracion de docs/changelog.
