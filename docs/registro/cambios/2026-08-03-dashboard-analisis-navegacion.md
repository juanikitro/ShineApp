# Dashboard: recorrido persistente en Analisis

## Cambio visible

La vista `Analisis` del Dashboard incorpora un recorrido persistente con anclas
a Pulso, Capacidad, Rendimiento, Comercial, Ejecucion y Lecturas. Permite saltar
a cada bloque sin ocultar datos ni convertir el analisis en paneles plegables.

La navegacion es de interfaz: conserva el modo de lectura, los filtros de
periodo, los datos mostrados, calculos, permisos, acciones y contratos de API.
En pantallas angostas mantiene el recorrido disponible dentro del layout
responsive existente.

## Validacion

- Pruebas focalizadas de `DashboardAnalyticsPanel` para las anclas y el
  recorrido de Analisis.
- Revision visual responsive y de foco/labels accesibles.
