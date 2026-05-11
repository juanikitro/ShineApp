# Agenda: acciones compactas en tarjetas de reserva

## Cambio

Las tarjetas de reserva en Agenda pasan a usar una sola zona compacta de acciones, sin menus ni pasos extra.

- `Cancelar` deja de verse como boton lleno y pasa a icono destructivo secundario.
- El icono destructivo usa un tacho de basura para la accion de cancelar.
- `Confirmar` y `Activar` quedan como CTA textual principal cuando la reserva lo requiere.
- Si la reserva ya tiene trabajo asociado, `Iniciar`, `Marcar listo`, `Entregar` y `Cobrar` comparten la misma fila con jerarquia visual contextual.
- Cuando conviven dos acciones operativas, una queda llena y la otra outline para bajar ruido visual sin perder acceso directo.
- `Cobrar` solo aparece si el trabajo asociado tiene deuda pendiente mayor a cero.
- La linea del vehiculo muestra marca y modelo juntos cuando ambos existen.

## Alcance

- No cambia endpoints, payloads ni logica backend.
- Se mantienen los mismos `POST` para reserva, cambio de estado de trabajo y cobro.
- El cambio queda encapsulado en la agenda; no redefine el patron global de botones del resto de la app.

## Validacion esperada

- Una reserva `pending` debe mostrar `Confirmar` como CTA principal y `Cancelar` como accion icon-only.
- Una reserva `confirmed` con trabajo `pending` debe priorizar `Iniciar` y dejar `Cobrar` como secundaria.
- Una reserva `confirmed` con trabajo `ready` y deuda pendiente debe priorizar `Cobrar` y dejar `Entregar` como secundaria.
- Una reserva con trabajo y deuda `0` no debe mostrar `Cobrar`.
