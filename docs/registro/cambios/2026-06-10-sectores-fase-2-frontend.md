# Sectores fase 2 - Frontend: gestión de sectores, agenda dinámica y settings (2026-06-10)

## Contexto

Segunda fase del cambio descrito en
`docs/registro/decisiones/2026-06-10-sectores-configurables-por-negocio.md`.
Conecta el dataset `sectors` al frontend y reemplaza el toggle fijo
wash/detailing por un selector dinamico de sectores en la agenda y un CRUD
de sectores en settings.

## Wiring de datos

- `frontend/lib/data-loading.ts`: nuevo `DataSetKey` `"sectors"` incluido en
  las secciones `agenda`, `services`, `settings`, `notifications`, `quotes`.
- `frontend/lib/app-data.ts`: `case 'sectors' → apiList('/sectors/')`.

## Libs actualizadas

- `frontend/lib/agenda.ts`: `agendaSectorForReservation` y
  `filterAgendaReservationsBySector` usan `sectorKey: string` en vez del literal
  `'wash'|'detailing'`.
- `frontend/lib/scheduling-availability.ts`: capacidad por sector via
  `sector.default_capacity`.
- `frontend/lib/page-support.tsx`: labels de sector desde el objeto `Sector`.

## Componentes actualizados

- `ServiceForm.tsx`: selector de **Sector** reemplaza el campo "Tipo".
- `SettingsWorkspace.tsx`: CRUD completo de sectores (alta, edicion, orden,
  activar/desactivar, color) + un input de capacidad por sector (reemplaza los
  dos inputs wash/detailing).
- `TurneraSettingsPanel.tsx`: agrupa servicios por sector; visibilidad publica
  = `sector.public_visible`.
- `ReservationForm.tsx`: preview de cupo del sector primario.
- `ServicesPanel.tsx`: badge/columna de sector.
- `app/page.tsx`: estado `sectors`, `agendaSectorKey` (con modo `"todos"`);
  el toggle wash/detailing se reemplaza por un selector dinamico de sectores; en
  modo "Todos" se renderizan carriles paralelos por sector con cabecera de
  capacidad y color.
