# Dedupe de recargas GET del cliente

## Cambio

Las recargas forzadas del cliente vuelven a aprovechar la deduplicación de
GETs equivalentes en vuelo. Las recargas posteriores a una mutación conservan
una solicitud independiente para no mostrar datos previos a la escritura.

Se actualiza `pdfjs-dist` a la primera versión no afectada por el advisory de
ejecución de JavaScript al abrir PDFs maliciosos. El lockfile también fija
`nanoid` en la primera versión fuera del rango vulnerable transitivo de
`postcss`.

## Alcance

No se modifican endpoints, payloads, permisos ni caché compartida. La medida
reduce trabajo redundante de la función Django cuando dos recargas equivalentes
coinciden en el tiempo.

La actualización de dependencias no cambia el contrato de la previsualización
de PDF; el build del frontend resuelve su entrypoint y las pruebas de esa
previsualización mantienen el comportamiento cubierto.
