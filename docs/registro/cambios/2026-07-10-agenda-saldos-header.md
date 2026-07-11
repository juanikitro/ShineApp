# Agenda: saldos diarios en el encabezado semanal

Fecha: 2026-07-10

Contexto:
- El encabezado diario de la agenda semanal mostraba la fecha y el conteo de movimientos, pero no resumía la plata asociada a los trabajos visibles en ese día.

Cambio:
- Debajo de la fecha, junto al conteo de movimientos, se muestran los importes de `Cobrado` en verde y `Por cobrar` en rojo.
- Los importes se calculan desde las órdenes de trabajo ya cargadas en la agenda (`paid_amount` y `balance_due`) y se deduplican por orden para no sumar dos veces la misma orden dentro del mismo día.
- La línea de movimientos y saldos queda alineada con el texto de la fecha.

Validación:
- Frontend: `npm run test:agenda`.
