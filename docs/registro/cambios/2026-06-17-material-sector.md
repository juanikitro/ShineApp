# Material: asignación de sector

Fecha: 2026-06-17

## Cambio

Los materiales (Stock) ahora pueden asignarse a un sector (Lavadero, Detailing, etc.), igual que los servicios.

## Impacto

- `Material.sector`: FK nullable a `catalog.Sector` (SET_NULL al borrar sector).
- API `/api/materials/`: nuevo campo `sector` (writable) y `sector_name` (read-only). Filtro `?sector=<id>` y `?sector=none`.
- Formulario de nuevo material: dropdown de sector (opcional, "Sin sector" por defecto).
- Modal de detalle de material: selector de sector editable.
- Panel de inventario: tabs Todos / Lavadero / Detailing / Sin sector para filtrar la lista de materiales.

## Migración

`inventory/0015_material_sector.py` — AddField nullable, sin datos a migrar.
