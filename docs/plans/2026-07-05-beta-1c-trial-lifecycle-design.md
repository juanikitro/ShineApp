# Beta 1C - Lifecycle visible del trial

## Objetivo

Hacer visible dentro del producto el estado de la prueba de 14 dias para que un
dueno de negocio pueda entender si la prueba esta activa, por vencer o vencida
sin abrir Django admin ni consultar la API.

## Decision

Implementar una franja operativa en el Dashboard para usuarios con vista de
economia. El backend ya entrega `subscription_type`, `trial_ends_at`,
`trial_days_remaining` y `trial_expired` en `GET /api/auth/me/`, por lo que no
hace falta crear endpoints ni migraciones.

## UX

- Trial activo: confirma dias restantes y empuja a completar alta guiada,
  primer turno y caja.
- Trial por vencer: cambia a tono de advertencia cuando quedan 3 dias o menos.
- Trial vencido: informa vencimiento sin bloquear el negocio por UI.
- CTA comercial: abre WhatsApp con un mensaje listo para continuidad
  comercial.

## Fuera de alcance

- Billing real, Stripe, checkout o portal de pagos.
- Bloqueo automatico de acceso por trial vencido.
- Nuevos estados de base de datos.
- Automatizaciones de email o WhatsApp.

## Validacion

- Tests unitarios del helper de lifecycle.
- Tests del componente de banner.
- Typecheck frontend.
- Docs-check e inspeccion de diff.
