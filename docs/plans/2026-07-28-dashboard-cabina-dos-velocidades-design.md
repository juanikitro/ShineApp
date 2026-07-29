# Dashboard: cabina de dos velocidades

**Estado:** aprobado el 2026-07-28.

## Objetivo

Mejorar la usabilidad visual del dashboard sin modificar datos, endpoints,
permisos, cálculos, acciones ni textos de negocio. La superficie debe dejar de
sentirse como una lista extensa de tarjetas: Resumen prioriza la decisión diaria
y Análisis conserva toda la lectura disponible, pero la hace recorrible.

## Dirección de interfaz

- **Dominio:** orden de trabajo, agenda, caja, cobranza, materiales y tareas.
- **Intención:** una persona que abre el sistema durante la jornada debe saber
  qué resolver ahora; cuando revisa resultados, debe poder recorrer el período
  completo sin perder orientación.
- **Paleta:** se conservan las superficies claras, gris de estructura y azul de
  foco existentes. Ámbar y rojo continúan reservados para atención y riesgo;
  no se agregan colores decorativos.
- **Profundidad:** bordes y cambios de superficie sutiles, sin sombras nuevas ni
  una nueva escala de radios.
- **Firma:** una línea de lectura explícita. En Resumen conecta `Ahora` con
  contexto económico; en Análisis conecta `Pulso` con las áreas de
  profundización.

## Alternativa elegida

Se descarta una compactación exclusivamente cosmética porque no resuelve la
orientación de una página larga. También se descarta plegar paneles porque
ocultaría datos de la vista analítica. Se implementa una cabina de dos
velocidades:

### Resumen: decisión diaria

1. La primera lectura reúne la acción siguiente, tareas e indicadores
   ejecutivos sin alturas forzadas ni columnas estiradas.
2. Los bloques de contexto posteriores reutilizan los mismos componentes y
   datos, con grillas que aprovechan el ancho disponible.
3. Las alertas, rankings y estados mantienen sus acciones y orden funcional;
   solo cambian su composición y densidad visual.

### Análisis: lectura completa orientada

1. Se conserva cada bloque analítico y toda su información visible.
2. Los bloques se organizan en capítulos visuales y grillas responsivas:
   pulso, conversión, rentabilidad, ejecución y cobranza.
3. Se incorpora una guía visual persistente de secciones para saltar dentro de
   la página. Es navegación de interfaz, no una nueva fuente de datos.
4. Las tablas y series conservan scroll horizontal únicamente si su semántica
   temporal lo requiere; se limita su ancho, se indica el desborde y no se usa
   scroll horizontal para el layout general.

### Controles de período

La elección Resumen/Análisis y el rango de fechas se separan visualmente: la
vista fija el modo de lectura y el rango controla los datos ya existentes. Se
mantienen todos los controles, callbacks y estados de carga actuales.

## Restricciones

- No cambiar datos mostrados, orden de negocio, cálculos, endpoints, payloads,
  permisos ni acciones.
- No agregar dependencias ni componentes de diseño externos.
- Reutilizar tokens, `Panel`, `MetricCard`, `RecordCard` y controles actuales.
- No sobrescribir los cambios locales existentes en los componentes de
  dashboard.
- Mantener teclado, foco visible, contraste, tema oscuro y diseño responsive.

## Áreas previstas

- `frontend/app/components/dashboard/DashboardPanel.tsx`
- `frontend/app/components/dashboard/DashboardAnalyticsPanel.tsx`
- `frontend/app/components/dashboard/DashboardPeriodToolbar.tsx`
- `frontend/app/styles/shell.css`
- Tests focalizados de los componentes de dashboard si cambia la estructura
  navegable o accesible.

## Validación

- Pruebas Vitest focalizadas de los componentes tocados, tras comprobar que no
  haya procesos Node activos de ShineApp.
- Revisión estática de la estructura responsive, labels accesibles y ausencia
  de cambios de contratos de datos.
- No se ejecutan build, suite completa o deploy sin autorización adicional.
