# Herramientas en inventario

## Contexto

Se agrega un modulo simple de Herramientas para controlar stock discreto e inversion operativa sin mezclarlo con deuda, caja o consumos de materiales.

## Contrato backend

- Modelo: `inventory.Tool`.
- Endpoint DRF: `/api/tools/`.
- Campos editables: `name`, `quantity`, `status`, `unit_value`, `purchased_at`, `is_active`, `notes`.
- Estados: `in_use` (En uso, default), `maintenance` (Mantenimiento) y `retired` (Retirada).
- Campo calculado: `total_value = quantity * unit_value`.
- Baja: `DELETE /api/tools/:id/` inactiva el registro con `is_active = false`.
- Listado: por defecto devuelve solo activas; `?include_inactive=1` incluye inactivas.
- Busqueda: `?search=` filtra por nombre, estado o notas.

## UI

La seccion `Herramientas` vive en la shell principal de `frontend/app/page.tsx`.
Reutiliza los patrones actuales de panel, formulario, lista, metricas y modal editable.
No modifica el flujo de materiales, compras ni consumos.

## Decision

La cantidad se modela como entero no negativo porque las herramientas son unidades discretas.
El estado por defecto es `in_use` porque una herramienta registrada se asume operativa salvo que se marque como mantenimiento o retirada.
No se integra con deudas ni caja en este corte para evitar efectos contables implicitos.
