# Caja: conciliacion y cierre simple

Fecha: 2026-05-09

## Decision

El modulo `Caja` separa dos lecturas:

- `Caja real`: cobros, pagos de deuda, compras que impactan caja, movimientos manuales y ajustes compensatorios.
- `Resultado economico`: movimientos devengados en `CashMovement`, incluyendo la deuda original como egreso unico.

La deuda original sigue creando un `CashMovement` de tipo `expense`. Los pagos de deuda se muestran como salida real de caja, pero no duplican el resultado economico porque el gasto ya fue registrado al crear la deuda.

## Cierre

El cierre diario es simple y bloqueante:

- `/api/cash/close/` guarda snapshot de resultado economico y caja real.
- Un dia cerrado no puede cerrarse por segunda vez.
- Pagos, movimientos manuales, deudas, pagos de deuda y compras de materiales no pueden impactar dias cerrados.
- Las correcciones posteriores se registran como `Ajuste de cierre` en el dia actual, referenciando el dia cerrado corregido.

## Auditoria visible

Las entradas de caja exponen origen, signo, fecha y usuario creador cuando existe. El frontend usa esos datos para distinguir cobro, compra, deuda original, pago de deuda, movimiento manual y ajuste.

## Resumen y filtros

Caja muestra un resumen de flujo del dia con selector entre `Caja real` y `Resultado economico`. Ese resumen siempre usa el dia completo para evitar que un filtro oculte movimientos y cambie la lectura del balance.

Los filtros operan solo sobre el listado de entradas. Permiten investigar por texto, tipo, origen, categoria, subcategoria, efecto en caja y rango de monto sin alterar los totales del resumen ni el cierre.

## Trade-off

No se implementa arqueo fisico con saldo inicial ni conteo por medio de pago. La iteracion prioriza seguridad operativa, lectura clara y compatibilidad con los contratos existentes.
