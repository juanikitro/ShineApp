# Horarios de apertura por dia de semana

**Fecha:** 2026-06-17

## Que cambia

Se agrega soporte para configurar dias y horarios de apertura del negocio por dia de semana (Lunes a Domingo). La agenda bloquea visualmente los dias no laborables y el formulario de reserva advierte cuando el dia elegido esta fuera del horario.

## Modelo nuevo: BusinessHours

- FK a `BusinessAccount`
- `day_of_week` (0=Lunes..6=Domingo)
- `is_open` (bool, default True; Domingo default False)
- `opening_time`, `closing_time` (TimeField nullable)
- `unique_together = [("business", "day_of_week")]`
- Migración `0027_businesshours`
- `ensure_business_hours(business)` crea las 7 entradas si no existen (idempotente)

## API

- `GET /api/settings/business-profile/` incluye `working_hours: [{day_of_week, is_open, opening_time, closing_time}]`
- `PATCH /api/settings/business-profile/` acepta `working_hours[]` y actualiza cada dia
- `GET /api/agenda/daily/?date=YYYY-MM-DD` retorna `is_working_day`, `day_opening_time`, `day_closing_time`
- `GET /api/public/landing/<slug>/availability/?date=YYYY-MM-DD` idem

## Frontend

- **Configuracion > Turnera:** nueva seccion "Dias y horarios de atencion" con grilla de 7 dias, toggle abierto/cerrado y campos de hora por dia
- **Formulario de reserva:** aviso de dia no laborable cuando el dia elegido tiene `is_open=false`; usa `opening_time`/`closing_time` del dia (si configurado) en vez del global
- **Agenda:** encabezado del dia muestra badge "Cerrado" con opacidad reducida en dias no laborables
- **Landing publica:** bloquea envio y muestra mensaje si el dia elegido es no laborable; slots de hora vacios en dias cerrados

## Compatibilidad

- Negocios existentes sin `BusinessHours`: `ensure_business_hours()` crea entradas en el primer PATCH o en el registro de nuevos negocios. Mientras no existan, el sistema cae al comportamiento previo (dia siempre abierto, horario global).
- Los horarios globales `opening_time`/`closing_time` del `BusinessProfile` siguen funcionando como fallback.
