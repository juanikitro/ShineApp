# UI / UX Implementation Plan - ShineApp

## Enfoque

Plan incremental, sin rehacer la app ni tocar contratos backend salvo necesidad real. El orden esta pensado para:

1. mejorar la experiencia visible rapido,
2. construir base reutilizable,
3. intervenir pantallas criticas despues de estabilizar primitives.

## Auditoria 2026-05-20 - estado del plan

La re-auditoria sobre `development` confirmo que varios P0/P1 historicos ya estan cerrados en codigo y QA: drawer mobile, settings mobile tabs, sidebar search, modal accesible, deep-linking, Agenda naming principal, encoding `Â·` en fuente UI y runtime productivo basico.

Estado por fase:

| Fase | Estado actual | Evidencia / ajuste |
| --- | --- | --- |
| Fase 1 | Mayormente cerrada | Shell mobile, sidebar search, settings mobile y naming no se reprodujeron como deuda vigente. Quedan solo deudas visibles nuevas o residuales documentadas en issues/backlog. |
| Fase 2 | Parcialmente cerrada | `ModalFrame`, `RecordCard` y estados base estan mejorados; `SearchSelect` sigue P1 por semantica/foco. |
| Fase 3A | Cerrada para desktop | Agenda desktop carga y navega bien; Agenda mobile conserva deuda P1 por ancho minimo del tablero. |
| Fase 4 | Parcialmente cerrada | Deep-linking y modal base estan cerrados; quedan dark mode tabs, login demo, caja y landing publica. |
| Fase 5 | Cerrada como hito local | Se preserva la nota local de cierre de Fase 5. La auditoria no requiere inventar una Fase 6; el siguiente batch vive en backlog. |

Siguiente batch recomendado: landing publica iconos de servicios, contraste dark de settings tabs, agenda mobile, `SearchSelect`, login demo prellenado y jerarquia de caja.

## Fase 1 - Mejoras visibles de bajo riesgo

### Objetivo

Subir percepcion profesional y reducir friccion sin tocar dominio ni endpoints.

### Alcance

- shell mobile compacto,
- eliminar controles muertos,
- alinear naming/IA principal,
- limpiar encoding/copy,
- arreglar tabs mobile de settings,
- mejorar estados vacios basicos,
- corregir pattern de card + acciones mas obvio donde el cambio sea local.

### Archivos a tocar

- `frontend/app/page.tsx`
- `frontend/lib/page-support.tsx`
- `frontend/app/components/layout/SidebarNav.tsx`
- `frontend/app/components/layout/AppShell.tsx`
- `frontend/app/components/ui/Empty.tsx`
- `frontend/app/styles/shell.css`
- `frontend/app/styles/forms.css`
- `frontend/app/styles/base.css`

### Riesgos

- romper navegacion actual al compactar el shell,
- introducir regresiones visuales cross-section,
- empeorar mobile si se intenta resolver agenda completa dentro de esta fase.

### Validacion

- `cd frontend && npm run build`
- smoke visual desktop/mobile:
  - login
  - dashboard
  - clientes
  - agenda
  - caja
  - configuracion
- teclado:
  - abrir/cerrar drawer
  - focus visible
  - botones principales

### Que NO tocar

- endpoints backend,
- serializers/modelos,
- reglas de negocio de agenda/caja,
- dark-mode redesign completo.

## Fase 2 - Componentes base / design system

### Objetivo

Construir primitives consistentes para dejar de arreglar pantalla por pantalla.

### Alcance

- `Button`
- `Input`
- `Tabs/Segmented`
- `Modal`
- `Empty/Loading/Error`
- `RecordCard`
- tokens y limpieza de hex visibles

### Archivos a tocar

- `frontend/app/components/ui/*`
- `frontend/app/styles/tokens.css`
- `frontend/app/styles/base.css`
- `frontend/app/styles/shell.css`
- `frontend/app/styles/forms.css`
- `frontend/app/styles/agenda.css`

### Riesgos

- romper demasiadas pantallas si se reemplaza todo de una vez,
- mezclar refactor tecnico con cambios visuales grandes.

### Validacion

- `cd frontend && npm run build`
- smoke comparativo de las secciones que usan esos primitives
- chequeo de foco, hover, disabled, loading

### Que NO tocar

- layout funcional de caja/agenda mas alla de adaptar primitives,
- domain actions,
- permisos.

## Fase 3 - Pantallas criticas del CRM

### Objetivo

Volver premium las superficies con mas peso operativo y comercial.

### Alcance

- Dashboard
- Agenda / Trabajos
- Clientes listado
- Customer dashboard
- Caja
- Configuracion

### Archivos a tocar

- `frontend/app/page.tsx`
- vistas/componentes extraidos desde `frontend/app/components/**`
- `frontend/app/styles/shell.css`
- `frontend/app/styles/agenda.css`
- `frontend/app/styles/forms.css`

### Riesgos

- querer resolver todos los modulos a la vez,
- cambiar demasiado la IA sin respaldo de uso real,
- degradar velocidad por exceso de wrappers.

### Validacion

- `cd frontend && npm run build`
- visual QA desktop/laptop/tablet/mobile
- tareas criticas:
  - login
  - crear cliente
  - navegar cliente dashboard
  - crear reserva
  - navegar agenda
  - registrar pago
  - editar negocio

### Que NO tocar

- backend contracts,
- automatismos de ordenes/reservas,
- modulos historicos no incluidos en la fase.

### Fase 3A - Agenda / Trabajos - Cerrada 2026-05-18

Estado: implementada y validada localmente.

Alcance entregado:

- agenda y trabajos unificados con jerarquia operativa mas clara,
- toolbar de agenda extraido a `frontend/app/components/agenda/AgendaBoardToolbar.tsx`,
- card de reserva/trabajo extraida a `frontend/app/components/agenda/AgendaReservationCard.tsx`,
- acciones principales separadas de acciones secundarias,
- columnas con contadores y lanes mas escaneables,
- empty/loading/error states normalizados con primitives de Fase 2,
- tabs/segmentos y `SearchSelect` probados dentro del flujo,
- responsive validado en desktop, laptop, tablet y mobile 390px.

Archivos principales:

- `frontend/app/page.tsx`
- `frontend/app/components/agenda/AgendaBoardToolbar.tsx`
- `frontend/app/components/agenda/AgendaReservationCard.tsx`
- `frontend/app/styles/agenda.css`

Validacion ejecutada:

- `cd frontend && npm run test`
- `cd frontend && npm run build`
- QA visual desktop/laptop/tablet/mobile
- smoke manual: login, navegar agenda, crear reserva desde cotizacion, abrir detalle, cambiar tabs/segmentos, usar `SearchSelect`, cerrar modal con `Escape`.

Notas de cierre:

- no se tocaron endpoints, payloads, permisos, reglas de negocio ni backend,
- para QA local se aplicaron migraciones SQLite pendientes y se reconstruyo `.next`,
- el boton superior `Crear` mantiene el contrato existente de cotizacion/reserva sin fecha prellenada; el `+` de cada dia sigue siendo el camino mas claro para crear una reserva fechada.

### Fase 3B - Clientes listado + Customer dashboard

Siguiente fase natural dentro de Fase 3. Agrupar ambas superficies evita mejorar el listado sin revisar el destino operativo real del click.

Objetivo:

- volver mas premium y accionable el modulo de clientes,
- mejorar escaneabilidad del listado,
- hacer que el dashboard/detalle de cliente priorice historial, vehiculos, reservas, deuda y acciones utiles,
- seguir reduciendo churn de `frontend/app/page.tsx` con componentes extraidos solo cuando aporten claridad.

Alcance sugerido:

- Clientes listado,
- customer dashboard / detalle de cliente,
- cards/filas con accion primaria clara y acciones secundarias separadas,
- empty/loading/error states normalizados,
- modales y `SearchSelect` consistentes con Fase 2,
- mobile usable en 390px y tablet/laptop,
- CSS en `frontend/app/styles/shell.css`, `forms.css` o partial correspondiente.

Que NO tocar:

- backend,
- endpoints, payloads, permisos ni reglas de negocio,
- automatismos de reservas/caja/deudas,
- redisenar todo el CRM.

## Fase 4 - Responsive + accessibility

### Objetivo

Dejar la experiencia utilizable y defendible en teclado y mobile real.

### Alcance

- drawer/header mobile
- agenda mobile pattern
- modales accesibles
- `SearchSelect` accesible
- `autocomplete` y `name` en auth/forms criticos
- focus management
- `Escape`, focus trap y focus return
- deep-linking de secciones mas importantes

### Archivos a tocar

- `frontend/app/page.tsx`
- `frontend/lib/page-support.tsx`
- `frontend/app/components/ui/ModalFrame.tsx`
- `frontend/app/components/ui/SearchSelect.tsx`
- `frontend/app/components/layout/SidebarNav.tsx`
- `frontend/app/styles/base.css`
- `frontend/app/styles/forms.css`
- `frontend/app/styles/shell.css`
- `frontend/app/styles/agenda.css`

### Riesgos

- romper comportamientos existentes de teclado o drag and drop,
- introducir complejidad excesiva en el select custom.

### Validacion

- `cd frontend && npm run build`
- tab order manual
- smoke teclado:
  - login
  - abrir modal
  - cerrar con `Escape`
  - navegar tabs
  - usar selects
- mobile screenshots en 390px y 768px

### Que NO tocar

- negocio/dominio,
- datos seed,
- copy comercial amplio.

## Fase 5 - Pulido premium / demo vendible

Estado: implementada y validada localmente en `development`.

Alcance entregado:

- microcopy operativo reforzado en dashboard, clientes, agenda, caja, deudas y configuracion,
- estados vacios y low-data con CTA mas claros,
- dashboard con lectura de periodo, prioridad operativa y estados de trabajo mas escaneables,
- consistencia fina de foco visible, nombres accesibles, spacing y densidad en superficies principales,
- ajustes frontend-only reutilizando componentes y tokens existentes.

Validacion ejecutada:

- `cd frontend && npm run test`
- `cd frontend && npm run build`
- `docker compose config --quiet`
- QA browser en 390px, 768px, laptop y desktop
- smoke manual: login, dashboard, clientes, agenda, caja, deudas y configuracion
- chequeo de foco visible, teclado, nombres accesibles y ausencia de overflow horizontal/clipping.

Notas de cierre:

- no se tocaron endpoints, payloads, permisos, reglas de negocio ni backend,
- los cambios quedaron incorporados en `development`,
- este plan no declara una Fase 6; cualquier siguiente trabajo deberia salir de hallazgos puntuales de QA/demo o backlog nuevo.

### Objetivo

Llevar la experiencia de "MVP funcional" a "SaaS vertical serio".

### Alcance

- microcopy mas fuerte,
- dashboards con mejor sentido de prioridad,
- variantes low-data/high-data,
- estados vacios con CTA,
- polish del dark mode,
- consistencia fina de espaciado y densidad,
- smoke visual estable en runtime productivo.

### Archivos a tocar

- `frontend/app/page.tsx`
- `frontend/lib/page-support.tsx`
- `frontend/app/components/ui/*`
- `frontend/app/components/layout/*`
- `frontend/app/styles/*`
- scripts/harness de QA visual si se agregan

### Riesgos

- pasarse de "polish" y caer en ruido visual,
- perder el tono sobrio de CRM operativo.

### Validacion

- `cd frontend && npm run build`
- smoke visual final desktop/mobile/dark
- checklist:
  - una accion primaria clara por pantalla
  - no hay controles muertos
  - no hay clipping
  - no hay copy rota
  - no hay estados vacios pobres

### Que NO tocar

- arquitectura backend,
- permisos,
- negocio operativo sin necesidad concreta.

## Recomendacion de secuencia real

1. Fase 1 completa
2. Fase 2 parcial sobre shell + tabs + modal + empty states
3. Fase 3 sobre agenda/clientes/caja
4. Fase 4 accesibilidad/responsive profunda
5. Fase 5 polish premium

## Primer prompt sugerido para ejecutar Fase 1

> Implementa la Fase 1 de `docs/ui-ux/UI_UX_IMPLEMENTATION_PLAN.md` en ShineApp. No toques backend ni contratos API. Prioriza shell mobile, tabs mobile de settings, renombre/IA de `Trabajos`, eliminacion o wiring del sidebar search, fix de cards navegables con acciones, limpieza de copy/encoding y mejora basica de empty states. Valida con `cd frontend && npm run build` y deja resumen de cambios + riesgos.

## Prompt sugerido para ejecutar Fase 3B

> Implementa la Fase 3B de `docs/ui-ux/UI_UX_IMPLEMENTATION_PLAN.md` en ShineApp, enfocada solo en Clientes listado + Customer dashboard. Objetivo: volver premium y mas operativo el modulo de clientes, mejorar jerarquia visual, densidad, mobile y claridad de acciones, aprovechando los primitives ya creados en Fase 2 y los patrones cerrados en Fase 3A. Alcance: listado de clientes, dashboard/detalle de cliente, cards/filas con accion primaria clara y acciones secundarias separadas, empty/loading/error states normalizados, modales y SearchSelect consistentes, mobile usable en 390px y tablet/laptop, CSS en `frontend/app/styles/shell.css`, `forms.css` o partial correspondiente. Reglas: no tocar backend, no cambiar endpoints/payloads/permisos/reglas de negocio, no redisenar todo el CRM, reutilizar patrones existentes y mantener diffs chicos y defendibles. Validacion: `npm run test`, `npm run build`, QA visual desktop/laptop/tablet/mobile y smoke manual: login, navegar Clientes, buscar/filtrar cliente, crear cliente, abrir dashboard/detalle, revisar vehiculos/reservas/deudas/historial disponible, usar SearchSelect en modales, cerrar modal con Escape.
