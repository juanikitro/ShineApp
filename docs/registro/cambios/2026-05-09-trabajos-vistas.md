# Trabajos con vistas operativas

## Cambio

La seccion visible `Agenda` pasa a mostrarse como `Trabajos`.

Dentro del modulo hay tres visualizaciones:

- `Agenda`: conserva la grilla por dias, drag and drop, navegacion y botones `+` por columna.
- `Estado`: agrupa reservas por el estado de su trabajo asociado (`Pendiente`, `En proceso`, `Listo` y `Entregado`) y permite moverlas entre estados con drag and drop.
  Solo muestra reservas con orden de trabajo real y activa; reservas canceladas o sin trabajo asociado quedan fuera de esta visualizacion para que la columna represente el estado del trabajo, no el estado de la reserva.
- `Fecha de ingreso`: agrupa reservas por `Reservation.day`, solo desde la fecha actual en adelante, en un maximo de dos columnas. Al final muestra `Sin fecha de ingreso` con cotizaciones libres sin reserva ni fecha tentativa.

El filtro `Lavado / Detailing` aplica a las tres visualizaciones.
El selector `Agenda / Estado / Fecha de ingreso` vive dentro del modulo, inmediatamente antes del contenedor de la vista activa.

## Contrato

Un trabajo no se crea manualmente sin reserva. La API rechaza `POST /api/work-orders/` cuando no trae `reservation`.

La autocreacion desde reservas confirmadas y el endpoint `POST /api/work-orders/from-reservation/` se mantienen.

## Alcance

- No cambia el modelo `WorkOrder`.
- No hay migracion de datos para registros historicos sin reserva.
- Las vistas nuevas usan los datos ya cargados por el frontend, sin endpoint agregado.
- Crear desde el boton global abre el flujo actual de cotizacion o reserva; si no hay fecha, sigue creando cotizacion libre y no trabajo.
- Las tarjetas visibles en `Estado` y `Fecha de ingreso` son reservas; la orden de trabajo se usa como dato asociado para estado, deuda, cobro y consumo de materiales.
- En `Estado`, la insignia visible de cada tarjeta muestra el estado del trabajo asociado.
