# Caja y agenda conectadas por rango

## Contexto

Caja y Agenda usaban fechas relacionadas, pero no habia una accion directa para saltar de un modulo al otro conservando el periodo operativo que el usuario estaba mirando.

## Cambio

Caja suma vista mensual y acciones para abrir el rango actual en Agenda. Agenda suma una accion para abrir su rango actual en Caja.

## Alcance

- Caja soporta dia, semana y mes.
- `GET /api/cash/monthly/?date=YYYY-MM-DD` devuelve totales y entradas del mes.
- La navegacion Caja -> Agenda preserva dia, semana o mes.
- La navegacion Agenda -> Caja preserva semana o mes.
- No cambia el cierre diario de caja ni las reglas de `cash_day`.

## Validacion esperada

Desde Caja de ayer, `Ver en agenda` abre Agenda sobre ese dia. Desde Agenda mensual, `Ver en caja` abre Caja mensual del mismo mes.
