# UI-009: extraccion de paneles principales

## Cambio

Batch de nueve extracciones sobre `frontend/app/page.tsx`. Cada panel pasa a vivir en su propio componente; `page.tsx` conserva estado, callbacks, fetch, permisos y logica de negocio.

## Componentes extraidos

| Panel | Path |
| --- | --- |
| CashPanel | `frontend/app/components/cash/CashPanel.tsx` |
| DebtPanel | `frontend/app/components/debts/DebtPanel.tsx` |
| DashboardPanel | `frontend/app/components/dashboard/DashboardPanel.tsx` |
| BusinessSettingsPanel | `frontend/app/components/settings/BusinessSettingsPanel.tsx` |
| SettingsWorkspace | `frontend/app/components/settings/SettingsWorkspace.tsx` |
| InventoryPanel | `frontend/app/components/inventory/InventoryPanel.tsx` |
| ToolsPanel | `frontend/app/components/tools/ToolsPanel.tsx` |
| QuotesPanel | `frontend/app/components/quotes/QuotesPanel.tsx` |
| ServicesPanel | `frontend/app/components/services/ServicesPanel.tsx` |

## Estado final de page.tsx

- Lineas: 14.436
- Coincidencias `render*`: aprox. 138

Antes del batch: 17.570 lineas / aprox. 164 `render*`.

## Patron aplicado

Componente recibe props explicitas (estado, callbacks, datos ya cargados). `page.tsx` conserva toda la logica: fetch, filtros, handlers, modales, side effects, endpoints, payloads, permisos y routing.

## Commits del batch

```
Extract services panel
Extract quotes panel
Extract tools panel
Extract inventory panel
Extract settings workspace panels
Extrae panel de negocio de configuracion
Extrae dashboard del shell principal
refactor(ui): extract debts panel
Cover paginated array API responses
```

## Validacion

Cada extraccion valido con `npm run build` limpio. QA smoke por seccion:
- deep-links `/?section=cash|debts|dashboard|settings|inventory|tools|quotes|services`
- desktop `1440x900` y mobile `390x844`
- sin login residual, sin overlay, sin console/runtime/network errors

## Deuda residual

Formularios, detail renders y calculos de negocio siguen en `page.tsx` por diseno de este ticket. Evaluar como ticket separado si se prioriza continuar la extraccion.
