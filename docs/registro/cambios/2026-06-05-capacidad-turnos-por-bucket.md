# Capacidad de turnos por bucket lavado y detailing

## Cambio

`DailyCapacity` deja de tener un unico `max_slots` y pasa a tener dos cupos por dia:

- `max_slots_wash`: cupos para la pestana Lavado de la agenda (incluye servicios `wash` y `combo`).
- `max_slots_detailing`: cupos para la pestana Detailing (servicios `detailing`).

La regla de bucket sigue la misma logica que la agenda (`frontend/lib/agenda.ts`): solo
`service_type == "detailing"` cae en Detailing; todo lo demas cae en Lavado.

## Backend

- `scheduling.models.DailyCapacity` reemplaza `max_slots` por `max_slots_wash` y
  `max_slots_detailing`. Ambos defaultean a `settings.DEFAULT_DAILY_CAPACITY`.
- `Reservation.capacity_for_day(day, business, bucket)` y
  `Reservation.used_slots_for_day(day, business, bucket, exclude_id)` ahora reciben
  `bucket` y filtran/devuelven solo el cupo del tipo de servicio correspondiente.
- `ReservationSerializer.validate` calcula el bucket desde
  `service.service_type` y bloquea la reserva con el mensaje
  `"La capacidad de turnos de lavado para este dia ya esta completa."` o
  `"... de detailing ..."` segun corresponda. Las reservas wash y detailing del mismo
  dia ya no compiten por el mismo cupo.
- `DailyCapacitySerializer` expone `max_slots_wash`, `max_slots_detailing`,
  `used_slots_wash`, `used_slots_detailing`, `available_slots_wash`,
  `available_slots_detailing`.
- `DailyAgendaView` (`GET /api/agenda/daily/`) reemplaza `max_slots`/`used_slots`/
  `available_slots` por objetos `wash` y `detailing` con esas tres metricas.
- Migracion `scheduling/0007_daily_capacity_split_by_service_type.py` agrega las nuevas
  columnas, copia el valor previo de `max_slots` a ambos buckets y elimina la columna
  vieja. La reversion vuelve a `max_slots = max(max_slots_wash, max_slots_detailing)`.

## Frontend

- `DailyCapacityForm.tsx` ofrece dos inputs `Turnos lavado` y `Turnos detailing`. Foco
  inicial: `daily-capacity.max_slots_wash`.
- `SettingsWorkspace.tsx` muestra `Lavado N (usados U / libres L) - Detailing N (usados U / libres L)`
  por dia.
- `frontend/app/page.tsx` actualiza el estado del formulario, el reset y `editDailyCapacity`.

## Datos demo

- `seed_demo` setea `max_slots_wash` igual al cupo previo (`8` lunes a viernes, `5`
  sabado, `3` domingo) y `max_slots_detailing` = `max(wash - 4, 1)` para reflejar la
  proporcion tipica del taller.

## Validacion ejecutada

- `cd backend && py -3 -m pytest` -> 237 passed
- `cd frontend && npm run test` -> 32 archivos, 284 tests
- `cd frontend && npm run build` -> ok

## Tests agregados

- `tests/test_mvp_flows.py::test_reservation_capacity_separates_wash_and_detailing` cubre
  el flujo donde el cupo de lavado lleno no bloquea detailing y viceversa.

## Riesgos

- Datos existentes mantienen el cupo previo en ambos buckets, por lo que la capacidad
  total por dia puede duplicarse hasta que un operador ajuste manualmente cada cupo. Es
  consistente con el comportamiento anterior dentro de cada pestana.
