# Next.js: parches de seguridad de optimizacion de imagenes y Server Actions

## Que cambia

`next` y `eslint-config-next` suben de 15.5.27 a 15.5.28 con lockfile actualizado.
Se conserva la rama 15.5, React y los overrides existentes, incluido sharp 0.35.5.
No se usa `npm audit fix` ni se cambian componentes, endpoints o configuracion UI.

La release oficial 15.5.28 corrige GHSA-2464-fhr4-w9xw (RCE condicionada a
optimizacion de imagenes con SVG en Linux glibc) y GHSA-p3m5-59mp-jv5r (DoS en
App Router con Server Actions). El override sharp existente es el workaround
documentado para el primero; no corrige el segundo ni elimina el hallazgo de
Next por version. No se afirma explotabilidad ni incidente en el entorno real.

## Compatibilidad y validacion

El cambio es un patch dentro de Next 15.5. El metadata oficial conserva Node
>=20 entre sus versiones soportadas y React ^19, compatibles con Node 22 y
React 19 del proyecto. El audit sigue siendo obligatorio y no tiene excepciones.
Tests/build de CI comprueban compatibilidad; no equivalen a deploy o aceptacion
visual/humana. No se ejecutan payloads de explotacion ni pruebas de carga.

Validacion local en turno Node exclusivo: actualizacion minima con
`npm install --package-lock-only --ignore-scripts --no-audit --no-fund next@15.5.28 eslint-config-next@15.5.28`
y `npm audit --omit=dev`: cero vulnerabilidades. No se instalo ni modifico
`node_modules` compartido ni se ejecuto suite/build local. CI del SHA actualizado
debe completar tests/build/audit antes de incorporar el cambio.

Fuentes primarias revisadas el 2026-10-22:

- [Release 15.5.28](https://github.com/vercel/next.js/releases/tag/v15.5.28).
- [Optimizacion de imagenes](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw).
- [Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r).
