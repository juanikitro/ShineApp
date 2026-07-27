# Dashboard analitico: unidades de embudo y operacion

Fecha: 2026-07-27

## Decision

El embudo comercial del dashboard usa la **cotizacion** como unidad:

- una cotizacion individual cuenta una vez;
- una cotizacion grupal tambien cuenta una vez, aunque tenga varias lineas de auto y reservas hijas;
- una cotizacion grupal solo queda "con reserva" cuando todas sus lineas tienen reserva.

La carga operativa, los servicios y la recurrencia usan la **orden de trabajo** como
unidad. No se deben deducir volumen operativo a partir del numero de cotizaciones.

## Motivo

Cotizacion y orden responden preguntas distintas. La primera mide avance comercial;
la segunda mide capacidad y ejecucion. Mezclarlas inflaba el embudo para cotizaciones
grupales y hacia imposible comparar ventas con trabajo real.

## Consecuencias

- El embudo puede mostrar una cotizacion grupal como una conversion comercial y sus
  multiples ordenes aparecen solo en la carga operativa.
- "Entregada" y "cobrada sin saldo" describen el estado actual de todas las reservas
  y ordenes vinculadas a una cotizacion; no representan una cohorte historica de
  entregas.
- La recurrencia se limita a clientes con una orden operativa anterior al periodo;
  no supone recurrencia por haber creado un contacto o una cotizacion previa.

## Limites conocidos

El modelo no guarda tecnico responsable, metas configuradas ni historial temporal de
estados. Por eso el dashboard no publica rentabilidad por tecnico, cumplimiento de
metas ni tasas historicas de entrega como si fueran hechos disponibles.
