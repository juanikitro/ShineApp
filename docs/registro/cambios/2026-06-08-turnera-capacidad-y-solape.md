# Turnera: capacidad, fechas pasadas, slots de 15 min y solape

## Cambio

La turnera (admin y landing publica) ahora respeta el cupo configurado por dia
para lavado/detailing, bloquea fechas pasadas y trabaja en horarios de 15 min.
Ademas se incorpora la opcion "Solapar turnos" en la configuracion del negocio
para permitir o impedir reservas que se pisen en el mismo horario.

## Backend

- `BusinessProfile.allow_overlapping_reservations` (default `False`). Migracion
  `core/0020_businessprofile_allow_overlapping_reservations.py`.
- `BusinessProfileView` expone `allow_overlapping_reservations` para GET/PATCH.
- `ReservationSerializer.validate` agrega validacion de solape cuando la
  opcion esta apagada: si `start_time` esta seteado, calcula la ventana
  `[start_time, start_time+duracion)` y rechaza con el mensaje
  `"Ese horario se solapa con otra reserva existente."`. La duracion sale del
  total de items (o del servicio principal cuando no hay items).
- `notifications.views.PublicLandingAvailabilityView` (`GET
  /api/public/landing/<slug>/availability/?date=YYYY-MM-DD`) devuelve cupos
  usados/maximos por bucket, la lista de horarios ocupados (`start_time` +
  `duration_minutes`) y el flag `allow_overlapping`.
- `notifications.serializers.PublicLandingRequestSerializer.validate` ahora
  rechaza el pedido publico cuando el bucket esta lleno
  (`"La capacidad de turnos de ... ya esta completa."`) o cuando el horario se
  solapa con una reserva existente y la opcion esta apagada.

## Frontend

- `frontend/lib/scheduling-availability.ts` agrega los helpers
  `buildTimeSlots`, `scheduleAvailabilityForDay`,
  `computeReservationFormItemsDuration`, `timeToMinutes`, `todayIsoDate` y
  `formatCapacityLabel`. Slots por defecto de 15 min entre `opening_time` y
  `closing_time`.
- `frontend/app/components/forms/ReservationForm.tsx` recibe nuevas props
  (`allowOverlap`, `openingTime`, `closingTime`, `defaultDailyCapacity`,
  `services`, `reservations`, `dailyCapacities`). El input de fecha tiene
  `min=hoy`, muestra aviso de "fecha pasada", banner con cupo usado/maximo y
  bloquea el submit cuando no hay cupo. Los inputs de hora se convirtieron en
  `<select>` con slots de 15 min; los que se solapan aparecen deshabilitados.
- `frontend/app/components/settings/TurneraSettingsPanel.tsx` agrega el
  checkbox "Solapar turnos".
- `frontend/app/publica/[slug]/PublicLandingClient.tsx` carga
  `/availability/` al elegir fecha, muestra aviso de fecha pasada o sin cupo,
  bloquea el submit y reemplaza el input `type=time` por un `<select>` con
  slots de 15 min (los solapados quedan deshabilitados cuando la opcion no
  esta activa).
- `frontend/app/page.tsx` y `frontend/lib/page-support.tsx` propagan
  `allow_overlapping_reservations` al payload del perfil y al estado del form.

## Validacion ejecutada

- `cd backend && py -3 -m pytest` -> 269 passed
- `cd backend && py -3 manage.py check` -> 0 issues
- `cd frontend && ./node_modules/.bin/tsc --noEmit` -> ok
- `cd frontend && ./node_modules/.bin/vitest run` -> 38 archivos, 356 tests
- `cd frontend && node ./node_modules/next/dist/bin/next build` -> ok

## Tests agregados

- `backend/tests/test_reservation_overlap.py` cubre:
  - admin con `allow_overlapping_reservations=False` rechaza un horario que se
    pisa con otra reserva existente.
  - admin con la opcion activa permite el mismo horario.
  - reservas que no se pisan siguen permitidas.
  - `GET /availability/` devuelve cupos por bucket y los `occupied`.
  - `POST /requests/` publico rechaza por cupo lleno y por solape; la opcion
    activa lo permite.
- `backend/tests/test_business_profile.py` incluye un test que persiste
  `allow_overlapping_reservations` y otro que verifica el default `False`.
- `frontend/lib/scheduling-availability.test.mjs` cubre el armado de slots de
  15 min, el bloqueo por solape, el calculo de duracion total por items y la
  serializacion de capacidad.

## Riesgos

- El default `allow_overlapping_reservations=False` es restrictivo. Negocios
  ya configurados deben activar "Solapar turnos" si su operatoria asume
  reservas paralelas en la misma franja.
- El endpoint publico `/availability/` no esta cacheado (`Cache-Control:
  no-store` desde el cliente) para reflejar reservas creadas en tiempo real.
