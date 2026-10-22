# Caja mensual: ultimo egreso agregado

## Contexto

Issue #275. En Caja -> Mes faltaba un acceso evidente a los egresos y una forma de ver cual fue el ultimo egreso cargado. El listado se ordena por fecha del movimiento (`occurred_at`), que puede no coincidir con el momento de carga.

## Cambio

En la vista mensual existente (sin pantalla nueva), la seccion "Movimientos del mes" muestra un bloque "Ultimo egreso agregado" y un boton "Ver egresos del mes" que activa el filtro rapido Egresos.

## Reglas

- El destacado es el egreso (`movement_type = expense`) con mayor `created_at` dentro de las entradas de `GET /api/cash/monthly/`; helper `latestAddedCashExpense` en `frontend/lib/cash-entry.ts`.
- La pertenencia al mes la define la API (`month_start`/`month_end` y filtro por negocio); el frontend no reinterpreta `occurred_at` ni zonas horarias. Si el `month_start` del payload no coincide con el mes seleccionado (respuesta del nuevo mes en curso), el bloque muestra "Cargando egresos del mes..." en vez de un dato viejo o un vacio definitivo.
- `created_at` se compara como instante (`Date.parse`), por lo que offsets distintos (`-03:00`, `+00:00`) ordenan bien. Entradas sin `created_at` o con fecha invalida se ignoran; en empate gana la primera del listado devuelto por la API.
- El bloque muestra fecha del movimiento y fecha de carga por separado. Sin egresos: "Sin egresos cargados en el mes.". Con error de carga no se muestra.
- No cambia totales, resumen, orden del listado, filtros, permisos (`CanViewEconomy`), cierres ni API.
