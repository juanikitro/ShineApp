# Dedupe de recargas GET del cliente

## Cambio

Las recargas forzadas del cliente vuelven a aprovechar la deduplicación de
GETs equivalentes en vuelo. Las recargas posteriores a una mutación conservan
una solicitud independiente para no mostrar datos previos a la escritura.

## Alcance

No se modifican endpoints, payloads, permisos ni caché compartida. La medida
reduce trabajo redundante de la función Django cuando dos recargas equivalentes
coinciden en el tiempo.
