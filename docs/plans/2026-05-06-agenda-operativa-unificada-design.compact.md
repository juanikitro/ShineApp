# Agenda Operativa Unificada

## Problema

UI actual separa flujo operativo en dos superficies:

- `Agenda`: reservas y disponibilidad.
- `Trabajos`: ordenes, estados y acciones de ejecucion.

Operador necesita resolver todo desde turno del dia. Separacion obliga cambiar de modulo para mismo caso operativo, aunque dominio ya conectado por `Reservation -> WorkOrder`.

## Objetivo

Convertir `Agenda` en unica pantalla operativa diaria para:

- crear y confirmar reservas,
- crear ordenes desde la reserva,
- ver estado del trabajo asociado,
- cambiar estado de la orden,
- registrar cobros,
- registrar consumos de materiales,
- editar reserva u orden,
- ver detalle de unidad operativa completa.

UI de `Trabajos` debe desaparecer del frontend cuando `Agenda` cubra esas acciones.

## No objetivos

Este cambio no busca:

- fusionar `scheduling` y `workorders` en backend,
- reemplazar `Caja` o `Materiales` como modulos administrativos e historicos,
- mover compras de materiales a agenda,
- mover cierre de caja o movimientos manuales a agenda,
- redisenar arquitectura general del frontend.

## Fuente de verdad observada

- `backend/scheduling/models.py`: agenda y capacidad viven en `Reservation`.
- `backend/workorders/models.py`: ejecucion del trabajo vive en `WorkOrder`.
- `backend/workorders/views.py`: ya existe flujo `from-reservation`.
- `frontend/app/page.tsx`: UI actual ya carga `reservations`, `workOrders`, `payments` y `consumptions` en una pagina.
- `frontend/app/globals.css`: agenda actual ya tiene layout horizontal reutilizable.

## Decision aprobada

Mantener modulos de dominio separados; unificar solo experiencia operativa en UI.

Agenda representa unidad visual `reserva + orden asociada`, sin convertirlas en misma entidad. Relacion se resuelve en frontend desde `workOrder.reservation`.

## Superficie propuesta

### Navegacion

- Eliminar `Trabajos` de barra lateral.
- Mantener `Agenda` como entrada de operatoria diaria.
- Actualizar subtitulo de `Agenda` para reservas y trabajos.

### Layout

Mantener estructura actual:

- panel izquierdo: semana + alta de reserva,
- panel derecho: tablero semanal/diario.

No crear nuevas rutas ni nuevas pantallas en primera pasada.

### Tarjeta operativa

Cada item del tablero pasa a tarjeta operativa con dos capas.

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

Reusar modales existentes o variacion chica para:

- editar reserva,
- editar orden,
- registrar pago,
- registrar consumo,
- ver detalle enriquecido de unidad operativa.

Operatoria pesada no queda inline permanente para no romper escaneabilidad de agenda.

## Estrategia de datos

Primera pasada sin cambios de backend:

- seguir cargando `reservations` y `workOrders`,
- construir en frontend mapa `reservationId -> workOrder`,
- enriquecer cada tarjeta con orden asociada cuando exista.

Evita cambio de contrato innecesario y reutiliza informacion que pantalla ya carga hoy.

## Estrategia de interaccion

- Tarjeta completa sigue clickeable para abrir detalle.
- Botones internos deben seguir excluidos del click de detalle.
- `Cobrar` abre modal precargado con la orden.
- `Consumir material` reutiliza flujo actual precargado con la orden.
- `Editar` abre `DetailModal` de reserva u orden segun corresponda.

## Trade-offs

### Beneficios

- una sola superficie para seguir caso real,
- menos cambio de contexto,
- sin tocar boundaries del backend,
- reuse maximo de `page.tsx`, `DetailModal`, `Modal`, `runAction` y formularios actuales.

### Costos

- `page.tsx` queda mas cargado si no se extraen helpers chicos,
- agenda puede volverse ruidosa si hay demasiados botones por tarjeta,
- vista semanal necesita jerarquia visual clara para no mezclar reserva y trabajo.

## Mitigaciones

- mantener formularios largos en modal,
- extraer helpers de composicion o selectores a `frontend/lib/` si mejora legibilidad,
- conservar un solo CTA dominante por estado de tarjeta,
- reforzar resumen de trabajo con tipografia y grupos visuales, no con cajas nuevas excesivas.

## Validacion esperada

### Automatizada

- `cd frontend`
- `npm run build`

### Manual

1. Crear reserva desde agenda.
2. Confirmar reserva.
3. Crear orden desde tarjeta de agenda.
4. Cambiar estado de orden desde agenda.
5. Registrar pago desde agenda.
6. Registrar consumo de material desde agenda.
7. Editar reserva y orden desde agenda.
8. Verificar que ya no haga falta entrar a `Trabajos`.

## Restricciones

- Este checkout no tiene `.git`, por lo que no se deben inventar pasos de branch, commit o push en esta carpeta.
- Cambio debe preservar paleta dark-first y patron actual de paneles.
- No se debe introducir tooling nuevo de tests frontend en esta iteracion.
