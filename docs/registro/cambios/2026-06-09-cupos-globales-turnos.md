# Cupos globales de turnos con toggle de limite

## Cambio

Los cupos de turnos dejan de configurarse por dia. Ahora hay un cupo global por
negocio (uno para lavado y otro para detailing) que rige todos los dias por
igual, mas un toggle para aplicar o no el limite. Se elimina por completo el
modelo `DailyCapacity` (cupo por dia) y su UI.

Antes: el cupo por defecto salia de `settings.DEFAULT_DAILY_CAPACITY` (fijo, no
configurable, igual para lavado y detailing) y solo se podia ajustar creando un
`DailyCapacity` por cada dia. El limite siempre se aplicaba.

## Backend

- `BusinessProfile` (core) suma tres campos: `enforce_capacity_limit`
  (`BooleanField`, default `True`), `default_capacity_wash` y
  `default_capacity_detailing` (`PositiveIntegerField`, default
  `settings.DEFAULT_DAILY_CAPACITY`). Migracion
  `core/0022_businessprofile_capacity_defaults.py`.
- `BusinessProfileSerializer` (`config/views.py`) expone los tres campos para
  GET/PATCH, con validacion de cupo no negativo.
- Se elimina el modelo `scheduling.DailyCapacity`. Migracion
  `scheduling/0011_delete_dailycapacity.py` (`DeleteModel`).
- `Reservation.capacity_for_day(day, business, bucket)` ahora lee
  `BusinessProfile.default_capacity_wash` / `default_capacity_detailing` en vez
  de buscar un `DailyCapacity` del dia. Fallback a `DEFAULT_DAILY_CAPACITY` si no
  hay perfil.
- La validacion de capacidad solo corre si `profile.enforce_capacity_limit`:
  - admin: `ReservationSerializer.validate` carga el perfil una vez y gatea el
    chequeo de cupo (el chequeo de solape no cambia).
  - publico: `PublicLandingRequestSerializer.validate` solo llama a
    `_validate_capacity` cuando el limite esta activo.
- `DailyAgendaView` (`GET /api/agenda/daily/`) y
  `notifications._availability_payload`
  (`GET /api/public/landing/<slug>/availability/`) toman los cupos desde el
  perfil y agregan `capacity_enforced` al payload. Se quita el campo
  `capacity_id` de la agenda diaria.
- Se elimina `DailyCapacityViewSet`, la ruta `daily-capacities`
  (`config/urls.py`), `DailyCapacitySerializer` y `DailyCapacityAdmin`.
- `seed_demo` deja de crear `DailyCapacity`; setea en el perfil
  `enforce_capacity_limit=True`, `default_capacity_wash=8`,
  `default_capacity_detailing=4`.

## Frontend

- `frontend/lib/scheduling-availability.ts`: `scheduleAvailabilityForDay` cambia
  de `defaultDailyCapacity` + `dailyCapacities` a `defaultCapacityWash`,
  `defaultCapacityDetailing` y `enforceCapacity`; `ScheduleAvailability` suma
  `enforceCapacity`.
- `ReservationForm.tsx` y `PublicLandingClient.tsx` no muestran aviso ni
  bloquean el submit cuando el limite esta apagado; el banner informa
  "Sin limite de cupos".
- Configuracion -> Agenda -> "Capacidad de turnos" (`SettingsWorkspace.tsx`)
  pasa a editar el cupo global: toggle "Aplicar limite de cupos", "Cupo de
  lavado por dia" y "Cupo de detailing por dia", guardados con el perfil del
  negocio.
- Se elimina el formulario y flujo de cupo por dia: `DailyCapacityForm.tsx`,
  estado/handlers en `page.tsx`, la entidad `daily-capacity` en
  `page-support.tsx`, y el dataset `dailyCapacities` en `data-loading.ts` /
  `app-data.ts`. `page.tsx` propaga los tres campos del perfil al formulario,
  al payload PATCH y a `ReservationForm`.

## Validacion ejecutada

- `cd backend && py -3 -m pytest` -> exit 0 (todos pasan)
- `cd backend && py -3 manage.py check` -> 0 issues
- `cd backend && py -3 manage.py makemigrations --check --dry-run` -> No changes
- `cd frontend && ./node_modules/.bin/tsc --noEmit` -> ok
- `cd frontend && ./node_modules/.bin/vitest run` -> 44 archivos, 382 tests
- `cd frontend && node ./node_modules/next/dist/bin/next build` -> ok

## Tests

- `tests/test_business_profile.py`: defaults de cupo en GET, persistencia de los
  tres campos y rechazo de cupo negativo.
- `tests/test_reservation_overlap.py` y `tests/test_mvp_flows.py`: el cupo se
  configura en el perfil; nuevos casos donde `enforce_capacity_limit=False`
  permite reservar mas alla del cupo (admin y publico).
- `tests/test_multitenancy.py` y `tests/test_seed_demo.py`: sin referencias a
  `DailyCapacity`; el seed valida los cupos en el perfil.
- `frontend/lib/scheduling-availability.test.mjs`: nueva firma y propagacion de
  `enforceCapacity`. `frontend/lib/data-loading.test.mjs`: sin `dailyCapacities`.

## Riesgos

- Cambio de API interno y breaking: se elimina `GET/POST /daily-capacities/` y
  el campo `capacity_id` de la agenda diaria. Unico consumidor es este frontend.
- La migracion borra los `DailyCapacity` existentes (overrides por dia). Es lo
  buscado: el cupo pasa a regirse por el perfil del negocio.
- Default `enforce_capacity_limit=True` con cupo `DEFAULT_DAILY_CAPACITY`
  preserva el comportamiento actual hasta que el operador lo ajuste o lo apague.
