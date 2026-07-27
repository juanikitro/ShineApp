# Dashboard: cabina analitica del periodo

Fecha: 2026-07-27

## Objetivo

Separar con claridad dos modos del dashboard:

- **Resumen** conserva la lectura operativa inmediata, incluida la tarjeta
  `Siguiente accion`.
- **Analisis** se concentra en comparaciones, composicion, margen, carga y
  cobranza; no muestra la tarjeta `Siguiente accion`.

El selector `Resumen / Analisis` se ubica en el toolbar de periodo, al mismo
nivel que `Desde` y `Hasta`, para que la vista y el rango se lean como un
unico contexto de consulta.

## Datos y visualizaciones

La cabina reutiliza las unidades ya documentadas:

- cotizacion para embudo comercial;
- orden de trabajo para servicios, carga semanal y recurrencia;
- movimientos de caja para el pulso financiero;
- saldo facturado para cobranza y antiguedad.

Las visualizaciones se construyen con SVG/CSS locales y datos trazables:

1. pulso de caja y facturacion contra el periodo anterior;
2. columnas de facturacion actual/anterior;
3. composicion facturada por servicio;
4. ticket promedio actual/anterior;
5. margen por servicio con barra proporcional y variacion;
6. evolucion semanal apilada por estado actual;
7. embudo, recurrencia, cobranza y aging como lectura de apoyo.

El unico dato agregado es `previous_period.average_ticket`, derivado de la
misma agregacion de ordenes del periodo anterior. No requiere modelo ni
migracion y no representa una cohorte historica.

## Limites

No se infieren tecnico responsable, metas ni historiales de transicion de
estado. Cuando una serie o categoria no tiene actividad, la interfaz muestra
un estado vacio explicito en lugar de una grafica con ceros que parezca dato.

## Validacion

- API: contrato de `previous_period.average_ticket` y datos de analitica.
- Toolbar: seleccion de vista y controles de periodo accesibles.
- Dashboard: Resumen conserva `Siguiente accion`; Analisis no la renderiza.
- Panel analitico: cada visualizacion usa sus datos y comunica sus estados
  vacios.
