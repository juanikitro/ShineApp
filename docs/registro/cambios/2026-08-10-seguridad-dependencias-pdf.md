# Seguridad: actualización de dependencias de preview PDF

## Cambio técnico

El audit de dependencias de producción del frontend detectó vulnerabilidades de
alta severidad publicadas después del último release verde. Se actualizan:

- `pdfjs-dist` de `5.7.284` a `6.2.108`, que corrige la ejecución de JavaScript
  al abrir un PDF malicioso;
- `nanoid` transitivo de `3.3.16` a `3.3.18`, dentro del rango compatible de
  PostCSS, para corregir el caso de generadores con tamaño cero.

El preview conserva su import dinámico `pdfjs-dist/webpack.mjs`; no se cambian
endpoints, payloads, permisos, datos ni reglas de negocio. La actualización de
`@napi-rs/canvas` es transitiva y opcional, exigida por la versión corregida de
PDF.js.

## Validación

- `npm audit --package-lock-only --omit=dev` sin vulnerabilidades.
- El CI debe ejecutar build y las pruebas de preview PDF para confirmar la
  compatibilidad del paquete mayor.
