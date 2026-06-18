# Agenda: vista mensual

## Contexto

La agenda solo ofrecia la vista semanal (tablero de `AGENDA_VISIBLE_DAYS` dias) dentro del modo "Agenda". Para planificar a mayor plazo faltaba una vista mensual que diera una mirada de todo el mes de un vistazo.

## Cambio

Se agrega un sub-control "Semana / Mes" dentro del modo Agenda (no toca el control Agenda/Estado/Fecha de ingreso). En modo Mes se renderiza una grilla mensual (semanas completas, lunes a domingo) donde cada dia muestra:

- el numero de dia y un contador de reservas,
- hasta 3 chips de reserva (hora + cliente) ordenados por hora,
- un indicador "+N mas" cuando hay mas reservas.

La logica pura vive en `buildAgendaMonthGrid` (`frontend/lib/agenda.ts`), con tests en `frontend/lib/agenda.test.mjs`. El componente de presentacion es `frontend/app/components/agenda/AgendaMonthGrid.tsx`.

La navegacion de la toolbar pasa a moverse de a un mes en modo Mes; hacer click en un dia (o en un chip) hace drill-down a la vista semanal sobre esa fecha.

## Alcance

- No cambia el contrato de API ni el modelo de datos: la vista mensual reutiliza las reservas ya cargadas en cliente (`GET /reservations/`) y el filtro por sector existente.
- Respeta `show_stay_days_in_agenda`: una reserva multidia aparece en cada celda entre `day` y `exit_day`, con fase entry/stay/exit.
- No incluye drag&drop ni alta de reservas desde la grilla mensual; esas acciones se mantienen en la vista semanal/diaria.
- La semana arranca el lunes (`weekStartsOn: 1`).

## Validacion esperada

- Junio 2026 se muestra en 5 filas, con relleno gris de mayo/julio en las celdas fuera de mes y el dia actual resaltado.
- Una reserva del 9/6 al 11/6 aparece como chip en los tres dias (entry/stay/exit).
- Cambiar a Mes, navegar meses con las flechas, y hacer click en un dia vuelve a la vista Semana sobre esa fecha.
