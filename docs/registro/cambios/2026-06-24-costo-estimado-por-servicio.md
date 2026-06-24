# Costo estimado por servicio para ratio estimado (~)

## Cambio

Cada servicio puede tener un `estimated_material_cost` (costo de materiales cargado a mano,
opcional). Sirve como fallback para calcular el ratio de rentabilidad cuando el servicio NO
tiene receta (`ServiceMaterial`) ni consumo real registrado. Jerarquía de costo:
**consumo real > receta > costo estimado manual**. El valor que cae al estimado manual se
muestra con un prefijo `~` para aclarar que es estimado.

## Backend

- `catalog/models.py`: nuevo campo `Service.estimated_material_cost` (Decimal, nullable) y
  propiedades `recipe_material_cost` (suma cantidad x costo unitario, None sin receta),
  `effective_material_cost` (receta > manual) y `material_cost_is_estimated` (True solo con manual).
- `catalog/migrations/0014_service_estimated_material_cost.py`: AddField.
- `catalog/serializers.py`: `ServiceSerializer` expone `estimated_material_cost` (escribible,
  validación >= 0) y read-only `effective_material_cost` y `material_cost_is_estimated`.
- `catalog/views.py` (`ServiceViewSet.history`): `resolve_order_material_cost` aplica la
  jerarquía por orden; el `summary` agrega `material_cost_is_estimated`. Ahora una orden sin
  consumo real usa receta o costo estimado en vez de margen = precio.

## Frontend

- `lib/service-cost.ts` (+ `.test.mjs`): `serviceRecipeCost`, `serviceEstimatedCost`
  (`{cost, isEstimated}`), `serviceCostRatios` (`{margin, marginRate, costRatio}`) y
  `formatRatioLabel`. Espejo de la jerarquía del backend.
- `lib/service-detail-payload.ts`: agrega `estimated_material_cost` a los campos del PATCH.
- `app/page.tsx`: estado del formulario + `serviceCreatePayload` y bloque service en
  `cleanDetailPayload` que coercen `'' -> null` (DRF rechaza `''` en DecimalField). Input nuevo
  en el editor del detalle del servicio.
- `app/components/forms/ServiceForm.tsx`: input "Costo estimado de materiales" con nota de uso.
- `app/components/services/ServicesPanel.tsx`: la fila de precios muestra costo, margen % y
  costo/precio con `~` cuando es estimado; el dashboard del servicio marca Materiales/Margen y
  agrega métricas "Margen %" y "Costo/precio".

## Validacion

- Backend: `pytest` suite completa en verde (incluye `tests/test_service_estimated_cost.py`).
- Frontend: `npm run test:coverage` -> 493 tests OK, branches global 81.75% (gate >= 80%);
  `service-cost.ts` 100% stmt / 96% branch. `tsc --noEmit` sin errores.

## Notas

- Cambios de API aditivos (campos nuevos), compatibles.
- El `~` marca SOLO el caso de costo estimado manual (sin receta). Receta y consumo real no se marcan.
