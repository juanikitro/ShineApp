# Dashboard: densidad equilibrada sin vacíos

**Estado:** aprobado el 2026-07-28.

## Objetivo

Corregir los huecos visuales del resumen y análisis sin modificar datos,
acciones, endpoints, cálculos ni permisos.

## Decisiones

- Las cards que forman un par operativo comparten altura dentro de su fila.
- `Pulso comparativo` ocupa una fila completa para que sus dos series tengan
  ancho legible.
- `Capacidad de agenda` conserva todas las jornadas, pero las distribuye en una
  grilla compacta y responsive. No se pagina, recorta ni oculta información.
- Los bloques analíticos de contenido muy desigual dejan de compartir una fila:
  se apilan a ancho completo para no producir lienzo vacío.
- Un ranking sin registros usa un estado vacío explícito, nunca una columna
  visualmente vacía.

## Alcance técnico

- `DashboardPanel`: igualación de cards operativas y estado vacío de materiales.
- `DashboardAnalyticsPanel`: reordenamiento presentacional de pulso, capacidad
  y ejecución.
- `shell.css`: grillas responsive, alturas y densidad; sin tokens ni
  dependencias nuevas.

## Validación

- Tests focalizados de paneles de dashboard, incluyendo presencia de los
  estados vacíos y del recorrido analítico.
- Revisión de diff y `docs-check`.
