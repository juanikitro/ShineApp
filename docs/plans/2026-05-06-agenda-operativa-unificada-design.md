# Agenda Operativa Unificada

## Problema

La UI actual separa el flujo operativo en dos superficies:

- `Agenda` para reservas y disponibilidad.
- `Trabajos` para ordenes, estados y acciones de ejecucion.

En la practica, el operador necesita resolver todo desde el turno del dia. Esa separacion obliga a cambiar de modulo para seguir el mismo caso operativo, aunque el dominio ya este conectado por `Reservation -> WorkOrder`.

## Objetivo

Convertir `Agenda` en la unica pantalla operativa diaria para:

- crear y confirmar reservas,
- crear ordenes desde la reserva,
- ver el estado del trabajo asociado,
- cambiar estado de la orden,
- registrar cobros,
- registrar consumos de materiales,
- editar reserva u orden,
- ver el detalle de la unidad operativa completa.

La UI de `Trabajos` debe desaparecer del frontend cuando `Agenda` cubra esas acciones.

## No objetivos

Este cambio no busca:

- fusionar `scheduling` y `workorders` en backend,
- reemplazar `Caja` o `Materiales` como modulos administrativos e historicos,
- mover compras de materiales a agenda,
- mover cierre de caja o movimientos manuales a agenda,
- redisenar la arquitectura general del frontend.

## Fuente de verdad observada

- `backend/scheduling/models.py`: la agenda y la capacidad viven en `Reservation`.
- `backend/workorders/models.py`: la ejecucion del trabajo vive en `WorkOrder`.
- `backend/workorders/views.py`: ya existe el flujo `from-reservation`.
- `frontend/app/page.tsx`: la UI actual ya carga `reservations`, `workOrders`, `payments` y `consumptions` en una sola pagina.
- `frontend/app/globals.css`: la agenda actual ya tiene layout horizontal reutilizable.

## Decision aprobada

Mantener separados los modulos de dominio y unificar solo la experiencia operativa en la UI.

La agenda pasa a representar la unidad visual `reserva + orden asociada`, sin convertirlas en la misma entidad. La relacion se resuelve en frontend a partir de `workOrder.reservation`.

## Superficie propuesta

### Navegacion

- Eliminar `Trabajos` de la barra lateral.
- Mantener `Agenda` como punto de entrada para operatoria diaria.
- Actualizar el subtitulo de `Agenda` para reflejar reservas y trabajos.

### Layout

Se mantiene la estructura actual:

- panel izquierdo: semana + alta de reserva,
- panel derecho: tablero semanal/diario.

No se crean nuevas rutas ni nuevas pantallas para esta primera pasada.

### Tarjeta operativa

Cada item del tablero de agenda pasa a ser una tarjeta operativa con dos capas.

#### Capa reserva

Siempre visible:

- hora,
- cliente,
- vehiculo,
- servicio,
- estado de reserva,
- notas breves.

#### Capa trabajo

Visible cuando existe orden asociada:

- numero de orden,
- estado del trabajo,
- total,
- pagado,
- deuda,
- costo de materiales,
- entrega estimada,
- notas internas resumidas.

## Acciones

### Inline

Sin orden asociada:

- `Confirmar`
- `Crear orden`
- `Cancelar`

Con orden asociada:

- cambio de estado de la orden,
- `Cobrar`,
- `Consumir material`,
- `Editar`

### En modal contextual

Se reusan modales ya existentes o una variacion chica sobre ellos para:

- editar reserva,
- editar orden,
- registrar pago,
- registrar consumo,
- ver detalle enriquecido de la unidad operativa.

La operatoria pesada no queda desplegada inline de forma permanente para no destruir la escaneabilidad de la agenda.

## Estrategia de datos

Primera pasada sin cambios de backend:

- seguir cargando `reservations` y `workOrders`,
- construir en frontend un mapa `reservationId -> workOrder`,
- enriquecer cada tarjeta de agenda con la orden asociada cuando exista.

Esto evita abrir un cambio de contrato innecesario y reutiliza la informacion que la pantalla ya carga hoy.

## Estrategia de interaccion

- La tarjeta completa sigue siendo clickeable para abrir detalle.
- Los botones internos deben seguir excluidos del click de detalle.
- `Cobrar` abre un modal precargado con la orden.
- `Consumir material` reutiliza el flujo actual precargado con la orden.
- `Editar` abre el `DetailModal` de reserva u orden segun corresponda.

## Trade-offs

### Beneficios

- una sola superficie para seguir el caso real,
- menos cambio de contexto,
- sin tocar boundaries del backend,
- reuse maximo de `page.tsx`, `DetailModal`, `Modal`, `runAction` y formularios actuales.

### Costos

- `page.tsx` queda aun mas cargado si no se extraen helpers chicos,
- la agenda puede volverse ruidosa si se muestran demasiados botones por tarjeta,
- la vista semanal necesita jerarquia visual clara para no mezclar reserva y trabajo.

## Mitigaciones

- mantener formularios largos en modal,
- extraer helpers de composicion o selectores a `frontend/lib/` si mejora legibilidad,
- conservar un solo CTA dominante por estado de tarjeta,
- reforzar el resumen de trabajo con tipografia y grupos visuales, no con cajas nuevas excesivas.

## Validacion esperada

### Automatizada

- `cd frontend`
- `npm run build`

### Manual

1. Crear reserva desde agenda.
2. Confirmar reserva.
3. Crear orden desde la tarjeta de agenda.
4. Cambiar estado de la orden desde agenda.
5. Registrar pago desde agenda.
6. Registrar consumo de material desde agenda.
7. Editar reserva y orden desde agenda.
8. Verificar que ya no haga falta entrar a `Trabajos`.

## Restricciones

- Este checkout no tiene `.git`, por lo que no se deben inventar pasos de branch, commit o push en esta carpeta.
- El cambio debe preservar la paleta dark-first y el patron actual de paneles.
- No se debe introducir tooling nuevo de tests frontend en esta iteracion.
