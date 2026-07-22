# Frontend: override seguro de sharp

## Cambio

- El frontend fija `sharp@0.35.3` como dependencia directa y override de npm.
- Esto evita que la dependencia opcional de Next resuelva `sharp <0.35.0`,
  reportada por el audit de produccion por vulnerabilidades en libvips.

## Alcance

- No cambia la UI, la API ni los contratos de datos.
- El ajuste solo afecta la resolucion de dependencias durante la instalacion y
  el deploy del frontend.

## Validacion

- `npm audit --omit=dev --json` sin vulnerabilidades.
- Tests focalizados de la priorizacion del dashboard y su card: 8 casos OK.
