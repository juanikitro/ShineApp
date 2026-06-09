# Numeros principales del CRM a 32px (fix del cascade que los achicaba)

## Contexto

`AnimatedNumber` (de las animaciones del CRM) renderiza el valor como `<span>` dentro del `<strong>` de la metrica. Las reglas de label con combinador descendente lo atrapaban y lo forzaban al tamano del label:

- `.metric span { font-size: 12px }` pisaba el numero de toda `MetricCard` (dashboard, servicios, clientes, proveedores, ajustes) y de las cards primarias de Caja (`.metric.cash-metric`).
- `.cash-economic-panel span { font-size: 12px }` pisaba "Resultado del dia".

Efecto: todos los numeros con `AnimatedNumber` se renderizaban a 12px sin importar el `font-size` del `<strong>`. Por eso el fix previo de Caja (subir `<strong>` a 34px en `00f431c`) no se veia: el `<span>` interno mantenia su 12px.

## Cambio

`frontend/app/styles/shell.css`:

- Label scoping a hijo directo (deja de pisar el numero):
  - `.metric span` -> `.metric > span`
  - `.metric--attention span` -> `.metric--attention > span` (claro y dark)
  - `.cash-economic-panel span` -> `.cash-economic-panel > div > span`
- Tamano unificado a 32px:
  - `.metric strong`: 26px -> 32px (+ `line-height: 1.15`)
  - `.cash-metrics-primary .cash-metric strong`: 34px -> 32px
  - `.cash-economic-panel strong`: 30px -> 32px

El numero hereda el `font-size` del `<strong>`. "Por cobrar" y "Deudas vencidas" recuperan el numero oscuro (no naranja); la frase de "Resultado del dia" vuelve a fluir inline.

## Decisiones

- 32px como estandar unico de numero principal en todo el sistema (incluye Caja, que baja de 34/30 a 32 por consistencia; con el bug nunca se vio el 34 real).
- Fix por scoping de selector (no por reset de especificidad): preserva el color de label de `--attention` y limpia el bloque accidental de la descripcion de Caja.
- Numeros secundarios/detalle (comparacion 18px, antiguedad 14px, estado 22px, rankings/alertas 16px) se mantienen en su jerarquia.
- Sin cambios de backend, endpoints, permisos ni contratos.

## Validacion

- Cambio CSS puro; no toca TS, tests ni logica de build.
- `grep` confirma que no quedan reglas `* span` con combinador descendente pisando el numero.
- Worktree sin `node_modules`: no se corrio build local.
