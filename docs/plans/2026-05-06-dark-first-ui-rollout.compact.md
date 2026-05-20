# Rollout UI Dark-First

## Alcance

Aplicar direccion dark-first documentada en el frontend actual. No cambiar logica de negocio, endpoints, payloads ni workflows.

## Restricciones

- Mantener Next.js App Router.
- Mantener orquestacion de pantalla unica en `frontend/app/page.tsx`.
- Sin dependencias nuevas.
- Extraer solo componentes presentacionales.

## Enfoque Aprobado

1. Mover primitives visuales repetidas de `frontend/app/page.tsx` a `frontend/app/components/`.
2. Mantener estado, llamadas API, handlers y reglas de negocio dentro de `page.tsx`.
3. Reconstruir `frontend/app/globals.css` con sistema de tokens dark-first:
   - `#0B2447` como canvas principal de shell
   - texto claro en superficies oscuras
   - `#19376D` para superficies elevadas/interactivas
   - `#A5D7E8` para acentos/foco contenidos
4. Reemplazar espaciado inline ad hoc tocado por estilos con clases.
5. Validar con `npm run build`.

## Objetivo De Extraccion Presentacional

- layout: `AppShell`, `SidebarNav`, `PageHeader`
- ui: `Field`, `SearchSelect`, `StatusPill`, `Empty`, `ModalFrame`, `DetailModal`, `Panel`, `MetricCard`, `RecordCard`

## Resultado Esperado

- App completa alineada a la nueva direccion dark
- Mas reutilizacion presentacional
- Sin cambio de comportamiento

## Refinamiento: Modo Sobrio Integrado

Despues del primer rollout dark, el objetivo se ajusto:

- menos brillo
- menos gradientes
- menos sombras
- menos cajas aisladas
- menor border radius
- integracion visual mas fuerte entre sidebar, workspace, paneles y listas
