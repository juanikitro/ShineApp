# Configuracion de horas y permanencia en reservas

## Cambio

`Configuracion` suma una seccion `Agenda y reservas` para definir dos preferencias operativas del negocio:

- `Usar horas de ingreso y egreso`
- `Mostrar permanencia en todos los dias`

Ademas, las reservas ahora soportan `exit_time` opcional en API y backend.

Actualizacion 2026-05-09:
- En Configuracion, ambos flags se editan con toggles segmentados en lugar de checkboxes.
- `Usar horas de ingreso y egreso` usa los estados `Mostrar` y `Ocultar`.
- `Mostrar permanencia en todos los dias` usa los estados `Permanencia` e `Ingreso`.
- El frontend operativo toma el borrador actual del panel de configuracion para ocultar o mostrar esos datos de inmediato, sin esperar a la respuesta del guardado.

## Alcance

- Se reutiliza el singleton `core.BusinessProfile` y el endpoint existente `GET/PATCH /api/settings/business-profile/`.
- El flag de horas oculta o muestra los horarios en reservas, agenda, cotizaciones y listados relacionados.
- Si el flag de horas esta apagado, las reservas nuevas se guardan con `start_time = null` y `exit_time = null`.
- Los horarios historicos existentes no se borran; solo dejan de mostrarse mientras el flag este apagado.
- El flag de permanencia cambia la visualizacion de reservas multidia:
  - activo: la agenda las muestra en todos los dias entre ingreso y egreso;
  - inactivo: la agenda las muestra solo en el dia de ingreso.

## Contrato tecnico

- `BusinessProfile` expone:
  - `use_reservation_times`
  - `show_stay_days_in_agenda`
- `Reservation` expone:
  - `exit_time`
- `DailyAgendaView` respeta `show_stay_days_in_agenda` sin alterar la capacidad diaria, que sigue anclada al `day` de ingreso.

## Validacion esperada

- Apagar horas oculta inputs y textos horarios en la UI operativa.
- Prender horas vuelve a mostrar `Hora de ingreso` y `Hora de egreso`.
- Una reserva multidia vuelve a verse como span cuando la permanencia esta activa.
- La misma reserva queda solo en su dia de ingreso cuando la permanencia se desactiva.
