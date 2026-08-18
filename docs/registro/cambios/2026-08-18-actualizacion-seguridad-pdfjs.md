# Seguridad: actualizacion de PDF.js y nanoid

## Cambio tecnico

Se actualiza `pdfjs-dist` de 5.7.284 a 6.2.108 para resolver la vulnerabilidad
de severidad alta reportada por `npm audit`. El preview de PDF conserva el
entrypoint `pdfjs-dist/webpack.mjs`, por lo que no cambia su contrato de
renderizado.

El override de `nanoid` fija la version 3.3.18 para resolver la segunda
vulnerabilidad de produccion detectada por el mismo control.

## Validacion

- `npm audit --omit=dev --package-lock-only`
- `npm exec -- vitest run --maxWorkers=1 lib/pdf-preview.test.mjs`
- `npm run build`
