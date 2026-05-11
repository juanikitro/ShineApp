# Deudas: contrato economico

Fecha: 2026-05-07

## Decision

El modulo `Deudas` usa criterio economico devengado para evitar doble conteo:

- La deuda original crea un unico `CashMovement` de tipo `expense` por el total adeudado.
- Cada pago parcial queda registrado como `DebtPayment`.
- Los `DebtPayment` no crean movimientos de caja ni nuevos egresos.
- La caja diaria expone el egreso original con `debt` y `debt_concept` para que la UI lo muestre como deuda y no como movimiento generico.

## Impacto

Los reportes basados en `CashMovement` cuentan el gasto una sola vez, en la fecha de origen de la deuda. El historial de pagos permite ver trazabilidad, total pagado, saldo pendiente y estado sin inflar egresos.

## Trade-off

Para deudas, la vista de caja economica no representa flujo de efectivo puro: el egreso aparece al registrar la deuda, aunque el pago se haga despues. Este comportamiento es intencional para que el gasto no se duplique cuando se cargan pagos parciales.
