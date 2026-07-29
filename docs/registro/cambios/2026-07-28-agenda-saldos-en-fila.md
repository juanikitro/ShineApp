# Agenda: saldos diarios en una fila propia

## Cambio funcional

En el encabezado de cada dia de la agenda, la cantidad de movimientos queda en
su propia linea. Debajo, `Cobrado` y `Por cobrar` se muestran juntos en una
fila horizontal, preservando sus colores semanticos y el ajuste responsivo.

## Alcance

No cambia los importes, el calculo de saldos ni la interaccion para crear una
reserva desde el encabezado.

## Validacion

- `npm exec -- vitest run --maxWorkers=1 app/components/agenda/AgendaDayHeader.test.tsx`
