# Sectores fase 3 - Dashboard segmentado y landing pública por sector (2026-06-10)

## Contexto

Tercera fase del cambio descrito en
`docs/registro/decisiones/2026-06-10-sectores-configurables-por-negocio.md`.
El dashboard expone un desglose por sector y la landing publica filtra y agrupa
la disponibilidad segun `sector.public_visible`.

## Backend

- `backend/dashboard/views.py`: nuevo bloque `by_sector` en el payload del
  dashboard; agrega `"sector"` al `select_related` de WorkOrder para evitar
  N+1. El bloque agrupa ingresos, ordenes y top-servicios por `order.sector_id`.
- `backend/notifications/views.py`: `PublicLandingView` agrupa servicios por
  `sector.public_visible`; `_availability_payload` devuelve lista por sector.
- `backend/notifications/serializers.py`: capacidad publica expuesta por sector.

## Frontend

- `frontend/app/publica/[slug]/PublicLandingClient.tsx`: agrupa servicios por
  `service.sector`, lee `availability.sectors[]`, reescribe `capacityWarning`
  usando los sectores del payload.
- `frontend/app/components/dashboard/DashboardPanel.tsx`: nueva seccion
  "por sector" con desglose de ingresos y ordenes por cada sector activo.
