# Rollout UI Dark-First

## Alcance

Aplicar la direccion dark-first documentada sobre el frontend actual sin cambiar logica de negocio, endpoints, payloads ni workflows.

## Restricciones

- Mantener la estructura Next.js App Router.
- Mantener la orquestacion actual de pantalla unica en `frontend/app/page.tsx`.
- Sin dependencias nuevas.
- Extraer solo componentes presentacionales.

## Enfoque Aprobado

1. Mover primitives visuales repetidas desde `frontend/app/page.tsx` hacia `frontend/app/components/`.
2. Mantener todo estado, llamadas API, handlers y reglas de negocio dentro de `page.tsx`.
3. Reconstruir `frontend/app/globals.css` alrededor de un sistema de tokens dark-first:
   - `#0B2447` como canvas principal de shell
   - texto claro sobre superficies oscuras
   - `#19376D` para superficies elevadas/interactivas
   - `#A5D7E8` para acentos y foco contenidos
4. Reemplazar espaciado inline ad hoc por estilos con clases donde se toque.
5. Validar con `npm run build`.

## Objetivo De Extraccion Presentacional

- layout: `AppShell`, `SidebarNav`, `PageHeader`
- ui: `Field`, `SearchSelect`, `StatusPill`, `Empty`, `ModalFrame`, `DetailModal`, `Panel`, `MetricCard`, `RecordCard`

## Resultado Esperado

- App completa visualmente alineada a la nueva direccion dark
- Mejor reutilizacion de estructura presentacional
- Sin cambio de comportamiento

## Refinamiento: Modo Sobrio Integrado

Despues del primer rollout dark, la direccion objetivo se ajusto:

- menos brillo
- menos gradientes
- menos sombras
- menos cajas aisladas
- menor border radius
- integracion visual mas fuerte entre sidebar, workspace, paneles y listas
