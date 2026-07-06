# Fase 2C: primer turno y primer cobro guiados

## Cambio

- El panel `Alta guiada` del Dashboard suma un bloque `Primer recorrido operativo`.
- La accion `Crear primer turno` abre la reserva rapida con el dia actual precargado.
- La accion `Cobrar primer trabajo` abre el modal existente de cobro cuando hay un trabajo activo con saldo pendiente.
- Si todavia no hay trabajo cobrable, el paso de caja guia a crear el turno primero.

## Impacto

- Un negocio real vacio puede avanzar desde el dashboard hasta Agenda, Caja y Dashboard con datos reales.
- No se crean cobros automaticos ni se agregan endpoints nuevos.
- El artifact de QA acumulado se extiende para probar Fase 0 a 2C.

## Validacion esperada

- Tests frontend puntuales de readiness y panel de onboarding.
- Typecheck frontend.
- QA manual con `docs/deployment/fase-2b-production-qa.md`.
