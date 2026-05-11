# Categorias de ingresos configurables en Caja

Fecha: 2026-05-09

## Cambio

La configuracion de Caja ahora permite administrar clasificaciones de ingresos ademas de egresos. El perfil del negocio guarda `income_category_tree` con el mismo formato categoria-subcategoria que `expense_category_tree`.

## Impacto

- `/api/settings/business-profile/` expone y acepta `income_category_tree`.
- `/api/cash/daily/` devuelve `income_category_tree` y arma `category_options.income` desde esa configuracion.
- Los ingresos manuales con subcategoria nueva registran la combinacion en el perfil.
- Los cobros de orden y ventas de stock registran sus clasificaciones de ingreso automaticas.
- La UI de Configuracion > Caja muestra ingresos y egresos en el mismo listado y permite crear/editar/eliminar combinaciones por tipo.

## Criterio

Se mantiene el contrato historico de `category` y `subcategory` como texto simple en `CashMovement`. El arbol configurable solo ordena la carga operativa y no fuerza una migracion contable pesada.
