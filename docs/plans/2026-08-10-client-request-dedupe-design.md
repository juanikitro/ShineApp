# Dedupe de recargas de datos del cliente

## Objetivo

Reducir solicitudes GET autenticadas equivalentes que se superponen durante
recargas manuales, remounts o cambios de período, sin alterar endpoints,
payloads, permisos ni caché compartida.

## Decisión

`force` sigue recargando los datasets de la sección activa y conserva la
invalidación local existente. Ya no implica por sí mismo `bypassDedupe`.
Antes de crear un `AbortController`, el loader conserva por solicitud la clave
del conjunto de datasets y su alcance. Una segunda carga equivalente recibe la
misma promesa, por lo que no aborta ni duplica la primera solicitud.

Las recargas posteriores a una escritura usan
`revalidateAfterMutation: true`. Ese caso conserva `bypassDedupe` para no
aceptar una petición GET iniciada antes de la mutación.

## Alcance y validación

Se limita a la política de carga del cliente en `page.tsx` y su helper
testeable en `frontend/lib/`. No agrega caché persistente ni compartida, no
modifica el backend y no cambia contratos visibles.

La cobertura focalizada prueba ambos modos de política; el test existente de
`apiFetch` cubre que un bypass posterior a una mutación obtiene una solicitud
nueva.
