# UI / UX Improvement Backlog - ShineApp

## Criterio de priorizacion

1. Facilitar el uso diario.
2. Hacer que el producto se vea mas serio y vendible.
3. Reducir inconsistencias visibles.
4. Bajar deuda visual/arquitectonica.
5. No romper contratos ni flujos backend.

## Quick wins

| ID | Mejora | Impacto | Archivos probables | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| QW-01 | Eliminar o cablear el buscador muerto del sidebar. | Sube confianza inmediata. | `frontend/app/page.tsx`, `frontend/app/styles/shell.css` | bajo | ahora |
| QW-02 | Corregir strings con `Â·` y revisar copy roto. | Mejora polish de demo al instante. | `frontend/app/page.tsx` | bajo | ahora |
| QW-03 | Renombrar `Trabajos` para alinear la IA con `Agenda`/flujo real. | Baja friccion cognitiva. | `frontend/lib/page-support.tsx`, `frontend/app/page.tsx` | bajo | ahora |
| QW-04 | Compactar el bloque de logo en `Configuracion > Negocio`. | Gana densidad util. | `frontend/app/page.tsx`, `frontend/app/styles/shell.css`, `frontend/app/styles/forms.css` | bajo | ahora |
| QW-05 | Ajustar empty states con CTA contextual simple. | Menos pantallas "muertas". | `frontend/app/components/ui/Empty.tsx`, `frontend/app/page.tsx`, `frontend/app/styles/shell.css` | bajo | ahora |
| QW-06 | Agregar `autocomplete` correcto en login y forms auth. | Mejor accesibilidad y percepcion de calidad. | `frontend/lib/page-support.tsx` | bajo | ahora |

## Mejoras de alto impacto

| ID | Mejora | Impacto | Archivos probables | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| HI-01 | Rehacer shell mobile con drawer y topbar compacta. | Es el mayor salto de UX perceptible. | `frontend/app/page.tsx`, `frontend/app/components/layout/AppShell.tsx`, `SidebarNav.tsx`, `frontend/app/styles/shell.css`, `frontend/app/styles/forms.css` | medio | ahora |
| HI-02 | Resolver agenda mobile con patron propio. | Mejora la principal superficie operativa. | `frontend/app/page.tsx`, `frontend/app/styles/agenda.css`, `frontend/app/styles/forms.css` | alto | ahora |
| HI-03 | Separar cards navegables de acciones secundarias. | Corrige UX y accesibilidad a la vez. | `frontend/app/page.tsx`, `frontend/app/components/ui/RecordCard.tsx`, `frontend/app/styles/shell.css` | medio | ahora |
| HI-04 | Reordenar `Caja` por bloques claros: resumen, accion, filtro, listado. | Sube legibilidad en un modulo critico. | `frontend/app/page.tsx`, `frontend/app/styles/shell.css` | medio | despues |
| HI-05 | Crear variante compacta para dashboards de entidad con poco historial. | Evita grillas vacias y mejora storytelling. | `frontend/app/page.tsx`, `MetricCard.tsx`, `Panel.tsx`, `frontend/app/styles/shell.css` | medio | despues |
| HI-06 | Sincronizar secciones con URL. | Mejora navegacion, shareability y seriedad de producto. | `frontend/app/page.tsx`, `frontend/lib/page-support.tsx` | medio | despues |

## Refactors visuales necesarios

| ID | Refactor | Motivo | Archivos probables | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| RV-01 | Cortar `page.tsx` en vistas por seccion. | Hoy es cuello de botella para consistencia. | `frontend/app/page.tsx`, `frontend/app/components/**`, `frontend/lib/**` | alto | despues |
| RV-02 | Extraer toolbar/filter header comun. | Muchas secciones repiten el mismo patron con variantes. | `frontend/app/components/ui/*`, `frontend/app/page.tsx` | medio | despues |
| RV-03 | Unificar tabs/segmented controls. | Hoy `agenda`, `settings`, `cashflow` no se sienten un mismo sistema. | `frontend/app/components/ui/*`, `frontend/app/styles/shell.css` | medio | despues |
| RV-04 | Unificar layout de dashboards de entidad. | Clientes/servicios/proveedores comparten estructura conceptual. | `frontend/app/page.tsx`, `Panel.tsx`, `MetricCard.tsx` | alto | despues |

## Mejoras de design system

| ID | Mejora | Motivo | Archivos probables | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| DS-01 | Consolidar tokens y eliminar hex sueltos visibles. | El sistema ya existe, pero no gobierna todo. | `frontend/app/styles/tokens.css`, `base.css`, `shell.css`, `agenda.css` | medio | ahora |
| DS-02 | Normalizar Button/Input/Tabs/Card/Empty/Modal como primitives reales. | Son las piezas que mas impactan la consistencia. | `frontend/app/components/ui/*`, `frontend/app/styles/base.css`, `shell.css` | alto | despues |
| DS-03 | Redisenar theme switch para que responda al sistema. | Hoy es un outlier visual. | `frontend/app/page.tsx`, `frontend/app/styles/shell.css` | bajo | despues |
| DS-04 | Definir patrones de estado: loading, empty, error, success. | Hoy son heterogeneos y muy textuales. | `frontend/app/components/ui/*`, `frontend/lib/page-support.tsx`, `frontend/app/styles/shell.css` | medio | ahora |

## Mejoras para demo comercial

| ID | Mejora | Motivo | Archivos probables | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| DEMO-01 | Limpiar encoding, copy y labels ambiguos. | Son fallos chicos con impacto grande en percepcion. | `frontend/app/page.tsx`, `frontend/lib/page-support.tsx` | bajo | ahora |
| DEMO-02 | Dejar login en modo demo mas explicito o neutro. | Evita sensacion de "credenciales hardcodeadas". | `frontend/lib/page-support.tsx`, `frontend/app/styles/base.css` | bajo | despues |
| DEMO-03 | Crear smoke visual estable en runtime productivo. | Evita que `next dev` arruine demos internas. | scripts/harness, no UX visible | medio | despues |
| DEMO-04 | Pulir dashboard con modulo de atencion/proximas acciones. | Sube mucho el efecto "producto inteligente". | `frontend/app/page.tsx`, `frontend/app/styles/shell.css` | medio | despues |

## Mejoras para producto escalable

| ID | Mejora | Motivo | Archivos probables | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| SCALE-01 | Rutas o query params por seccion y por dashboards de entidad. | Hace shareable y trazable la UI. | `frontend/app/page.tsx` | medio | despues |
| SCALE-02 | Separar estado local por modulo y reducir acoplamiento cruzado. | Evita regresiones al crecer. | `frontend/app/page.tsx`, `frontend/lib/*` | alto | mas adelante |
| SCALE-03 | Componentizar filtros/listados/metricas por dominio. | Permite evolucionar cada modulo sin tocar todo. | `frontend/app/components/**` | alto | mas adelante |
| SCALE-04 | Incorporar acciones masivas en listas operativas. | Necesario cuando crezca el volumen. | `frontend/app/page.tsx`, `RecordCard.tsx`, `shell.css` | medio | mas adelante |

## Que hacer ahora / despues / mas adelante

### Ahora

- QW-01 a QW-06
- HI-01
- UI-006 / UI-007 / UI-011 / UI-018
- DS-01 y DS-04

### Despues

- HI-02 a HI-06
- RV-01 a RV-04
- DS-02 y DS-03
- DEMO-02 a DEMO-04

### Mas adelante

- SCALE-01 a SCALE-04
- refinamiento fino de dashboards y reporting
- variantes mas ricas por rol/permiso

## Primer batch recomendado

Si el objetivo es una **Fase 1 visible, de bajo riesgo y con impacto real**, el primer lote deberia ser:

1. Shell mobile nuevo.
2. Sidebar sin control muerto.
3. Renombre/IA de `Trabajos` -> flujo real.
4. Fix de cards navegables + acciones.
5. Fix de settings mobile tabs.
6. Copy/encoding polish.
7. Empty/loading/error base.

Ese lote no requiere tocar contratos backend y cambia mucho la percepcion general.
