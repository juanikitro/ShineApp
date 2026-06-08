# Horarios overnight en la pagina publica (cierre a medianoche o cruzando dia)

**Fecha:** 2026-06-08

## Cambio

La validacion de `preferred_time` en la solicitud publica soporta horarios
que cruzan medianoche. Antes, configurar `opening_time=08:00` y
`closing_time=00:00` rechazaba todas las solicitudes porque `preferred_time >
00:00` siempre es cierto. Ahora se reconoce el rango como overnight y se
acepta cualquier hora >= apertura o <= cierre.

## Convencion

- Si `closing_time <= opening_time`, el cierre es del dia siguiente
  (rango overnight).
- Si `closing_time > opening_time`, rango lineal (sin cambio respecto a la
  convencion previa: ver `2026-06-02-horario-apertura-cierre.md`).

Logica:

```
overnight = closing_time <= opening_time
valido    = overnight
              ? preferred_time >= opening_time or preferred_time <= closing_time
              : opening_time <= preferred_time <= closing_time
```

Casos:
- `08:00 -> 00:00` (overnight): 14:00 OK, 00:00 OK, 03:00 rechazada.
- `22:00 -> 05:00` (overnight, lavadero nocturno): 23:00 OK, 03:00 OK, 12:00 rechazada.
- `08:00 -> 20:00` (lineal): sin cambio.

## Alcance

- **Backend** (`notifications/serializers.py` `PublicLandingRequestSerializer.validate`):
  detecta overnight y aplica la formula. Para overnight el mensaje de error es
  `"El horario solicitado esta fuera del horario de atencion."`; para el caso
  lineal se preservan los mensajes existentes ("antes del horario de apertura"
  / "despues del horario de cierre"). El campo del `ValidationError` sigue
  siendo `preferred_time`.
- **Frontend** (`app/publica/[slug]/PublicLandingClient.tsx`):
  - Calcula `isOvernightHours` desde el payload publico.
  - El `<input type="time">` deja de pasar `min`/`max` cuando el rango es
    overnight: los navegadores no soportan rangos que envuelven medianoche y
    bloquearian cualquier hora razonable.
  - Validacion cliente en `submitRequest` que aplica la misma formula
    overnight antes del fetch.
  - El bloque de contacto agrega una pista al horario: `"08:00 - 00:00 (cierra
    a medianoche)"` cuando el cierre es `00:00`, o `"... (cierra al dia
    siguiente)"` en cualquier otro rango overnight.
- **Doc**: este archivo. La convencion previa
  (`2026-06-02-horario-apertura-cierre.md`) sigue valida para rangos lineales.

## Limitacion conocida

El elemento HTML `<input type="time">` no soporta rangos que envuelven la
medianoche. Por eso en overnight no se restringe el input por `min`/`max`
y la unica defensa antes del envio es la validacion cliente + backend.

## Tests

`backend/tests/test_public_landing_requests.py`:
- `test_public_request_accepts_preferred_time_with_midnight_closing`
  (08:00 -> 00:00: 14:00 OK, 00:00 OK, 08:00 OK, 03:00 rechaza).
- `test_public_request_overnight_range_accepts_late_and_early_hours`
  (22:00 -> 05:00: 23:00 OK, 03:00 OK, 12:00 rechaza).
- `test_public_request_rejects_preferred_time_outside_business_hours` previo
  (08:00 -> 18:00 lineal) sigue funcionando sin cambios.
