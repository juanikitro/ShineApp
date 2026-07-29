# Cobro automatico de reserva al entregar

Fecha: 2026-07-08

## Cambio

Configuracion > Agenda > Agenda y reservas agrega la preferencia `Cobro al entregar` con modo `Manual / Automatico`.

- Manual conserva el comportamiento previo: si el trabajo llega al paso final con deuda, la tarjeta prioriza `Cobrar` y deja `Entregar` como accion secundaria.
- Automatico prioriza `Entregar`; al confirmar la entrega, el backend registra el saldo pendiente completo como pago de la orden.
- El estado `En proceso` mantiene el contrato existente: al ocultarlo, se salta el boton `Iniciar` y el flujo avanza al siguiente estado activo.

## Backend

- `BusinessProfile.reservation_auto_charge_on_delivery` se expone en el serializer del perfil, admin y API de configuracion.
- `maybe_auto_charge_on_delivery()` centraliza la regla de cobro automatico y reutiliza `PaymentSerializer` para validar caja, metodo, monto y movimiento asociado.
- La regla se dispara en transiciones reales a `delivered` desde cambio de estado de orden, `complete` de reserva y PATCH de reserva.
- Si el cobro falla, la transaccion revierte la entrega y no deja pagos parciales.

## Frontend

- `ReservationStatusConfig` incluye `autoChargeOnDelivery`.
- El formulario del perfil sincroniza y persiste `reservation_auto_charge_on_delivery`.
- La barra de acciones de reservas mantiene `Cobrar` visible como accion manual secundaria cuando corresponde, pero en modo automatico prioriza `Entregar` en el paso final.

## Validacion esperada

- Negocio con flag apagado no crea pagos al entregar.
- Negocio con flag activo cobra saldo completo al entregar, con fallback `cash` si no hubo pagos previos.
- Con pagos previos, el cobro automatico usa el metodo del ultimo pago.
- Saldo cero no crea pagos duplicados.
- Caja cerrada bloquea la entrega y conserva el estado anterior.
- Empleado sin economia puede entregar y disparar el cobro automatico.

## Decision asociada

`docs/registro/decisiones/2026-07-08-cobro-automatico-al-entregar.md`.
