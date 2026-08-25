# Caja continua configurable por negocio

## Objetivo

Simplificar Caja para los negocios que no operan con apertura ni cierre diario,
sin borrar su historial ni perder la opcion de usar cierres cuando resulte
necesario.

## Decisiones aprobadas

- Cada `BusinessProfile` define si usa cierres diarios de caja.
- El valor inicial es desactivado: los negocios existentes pasan a caja
  continua con la migracion.
- Los registros `CashClosure` existentes se conservan para auditoria, pero se
  ignoran mientras el negocio use caja continua.
- En caja continua no se crean autocierres ni se bloquean pagos, deudas,
  compras, consumos o movimientos por un cierre historico.
- Configuracion muestra el selector en la seccion Caja. Cuando esta apagado,
  Caja oculta estado, cierre, reapertura, ajuste de cierre y referencias al
  snapshot guardado.
- Los endpoints especificos para cerrar y reabrir caja no cambian en este
  alcance. La UI no los invoca cuando el modo esta desactivado.

## Diseno

`BusinessProfile.use_cash_closures` es la fuente de verdad por negocio. Una
politica central en `finance.cash` decide si un `CashClosure` tiene efecto
operativo. Todos los guards existentes reutilizan esa politica, por lo que la
caja continua no deja bloqueadas rutas indirectas como pagos de deuda, compras
de materiales, consumos, gastos fijos o cobros al entregar.

Las vistas de Caja no sincronizan cierres pasados en modo continuo y exponen el
estado efectivo abierto aunque exista un snapshot historico. Cuando el selector
se reactiva, se conserva el contrato anterior: los cierres historicos vuelven a
ser efectivos y las vistas pueden volver a generar cierres automaticos de dias
pasados.

## Compatibilidad y limites

La migracion no borra ni modifica `CashClosure`, pagos ni movimientos. Cambia
unicamente el valor inicial de la nueva preferencia. Las pruebas que describen
el contrato de cierre explicitan la preferencia activada para no depender del
default anterior.

No se altera el significado contable de Caja real ni Resultado economico, ni
los endpoints de cierre y reapertura usados fuera de la interfaz.

## Pruebas

- Perfil: serializacion y persistencia del selector.
- Caja continua: no autocierre, cierres historicos ignorados y operaciones
  antes bloqueadas permitidas.
- Cierre diario: autocierre, bloqueo y ajuste existentes se mantienen al
  activarlo.
- Configuracion y Caja: toggle accesible y ausencia de controles de cierre en
  modo continuo.
