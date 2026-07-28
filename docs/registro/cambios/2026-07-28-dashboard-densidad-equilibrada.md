# Dashboard: densidad equilibrada

## Cambio visible

El resumen ahora mantiene parejas las cards de `Siguiente acción` y `Tareas
importantes`. En análisis, `Pulso comparativo` ocupa una fila completa y las
jornadas de `Capacidad de agenda` se muestran todas en una grilla compacta y
responsive, sin scroll interno ni datos omitidos.

Los grupos con contenido de alturas muy distintas se apilan a ancho completo
para evitar lienzo vacío. Los rankings ajustan sus columnas al ancho disponible
y `Materiales por costo` informa explícitamente cuando no existen imputaciones.

## Alcance

- No cambian endpoints, payloads, permisos, cálculos ni acciones.
- No se agregan dependencias ni se modifican datos.

## Validación

- `npm test -- app/components/dashboard/DashboardAnalyticsPanel.test.tsx app/components/dashboard/DashboardPanel.test.tsx`
- `py -3 scripts/check_docs.py --write --skip-build`
