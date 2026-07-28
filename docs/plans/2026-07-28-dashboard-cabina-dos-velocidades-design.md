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
  foco existentes. Ámbar y rojo continúan reservados para atención y riesgo.
- **Firma:** una línea de lectura explícita. En Resumen conecta `Ahora` con
  contexto económico; en Análisis conecta `Pulso` con las áreas de
  profundización.

## Alternativa elegida

Se descarta una compactación exclusivamente cosmética porque no resuelve la
orientación de una página larga. También se descarta plegar paneles porque
ocultaría datos de la vista analítica. Se implementa una cabina de dos
velocidades.

### Resumen: decisión diaria

1. La primera lectura reúne la acción siguiente, tareas e indicadores
   ejecutivos sin alturas forzadas ni columnas estiradas.
2. Los bloques de contexto posteriores reutilizan los mismos componentes y
   datos, con grillas que aprovechan el ancho disponible.

### Análisis: lectura completa orientada

1. Se conserva cada bloque analítico y toda su información visible.
2. Los bloques se organizan en capítulos visuales y grillas responsivas.
3. Se incorpora una guía visual persistente de secciones para saltar dentro de
   la página. Es navegación de interfaz, no una nueva fuente de datos.
4. Las tablas y series conservan scroll horizontal únicamente si su semántica
   temporal lo requiere; no se usa para el layout general.

## Restricciones y validación

- No cambiar datos, cálculos, endpoints, payloads, permisos ni acciones.
- No agregar dependencias ni componentes de diseño externos.
- Mantener teclado, foco visible, contraste, tema oscuro y diseño responsive.
- Ejecutar pruebas Vitest focalizadas; CI valida cobertura y build antes del
  deploy de demo en producción.
