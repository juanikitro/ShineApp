# Agenda con pestanas Lavado y Detailing

## Cambio

La vista Agenda separa las reservas en dos pestanas operativas:

- `Lavado`
- `Detailing`

El toggle solo afecta la visualizacion del tablero. No cambia endpoints, payloads, creacion de reservas, drag and drop ni acciones de estado/cobro.

## Regla de clasificacion

La reserva se clasifica por el tipo del servicio principal:

- `detailing` se muestra en `Detailing`.
- `wash`, `combo` o tipos no resueltos se muestran en `Lavado`.

Si la reserva no trae el tipo en su payload, el frontend lo resuelve cruzando el `service` de la reserva o el primer item contra la lista de `/services/` ya cargada.

## Validacion esperada

- El tablero conserva la navegacion por dias y la tarjeta multidia.
- Las reservas de cada pestana no se mezclan visualmente.
- Una reserva mixta se muestra una sola vez segun su servicio principal.
