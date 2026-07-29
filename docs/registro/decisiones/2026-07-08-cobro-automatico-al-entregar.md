# Cobro automatico al entregar reservas

Fecha: 2026-07-08

## Contexto

La simplicidad de Agenda ya permite saltar estados del flujo de reserva por negocio. Algunos operadores tambien quieren saltear el paso manual `Cobrar` cuando el ultimo paso real es `Entregar`: si la reserva tiene una orden con saldo pendiente, la entrega debe registrar ese saldo sin pedir importe manual.

## Decision

- `BusinessProfile` suma `reservation_auto_charge_on_delivery` con default `False`.
- El default conserva el flujo historico: con deuda pendiente, la UI prioriza `Cobrar` antes de `Entregar`.
- Cuando el flag esta activo, una transicion real a `delivered` registra automaticamente un pago por el saldo pendiente completo de la orden asociada.
- El cobro automatico usa `payment_type=payment`, nota `Cobro automatico al entregar`, el metodo del ultimo pago no borrado de la orden y fallback `cash`.
- Si no hay saldo pendiente, no se crea pago.
- Si el pago no valida, por ejemplo por caja cerrada, la entrega queda bloqueada dentro de la misma transaccion.
- Empleados sin acceso a economia pueden disparar este side effect al entregar, pero no ganan permisos para ver economia ni crear pagos manuales.
- El side effect registra auditoria con metadata `auto_charge_on_delivery`, `reservation` y `work_order`.

## Alcance

- Aplica solo a transiciones reales hacia `Entregada`; guardar otra vez una reserva ya entregada no duplica cobros.
- Aplica a los caminos API que entregan desde orden de trabajo, accion `complete` de reserva y PATCH de reserva con `status=delivered`.
- El boton manual `Cobrar` se mantiene para anticipos y para saldos historicos de reservas ya entregadas.

## Trade-offs

- Se automatiza caja al entregar solo cuando el negocio lo habilita explicitamente.
- El metodo de pago inferido puede no coincidir con una decision puntual del operador; por eso se conserva el boton manual para cobros anticipados o correcciones.
- El bloqueo por caja cerrada es intencional: evita que una reserva figure entregada sin el cobro automatico que el negocio configuro como obligatorio.
