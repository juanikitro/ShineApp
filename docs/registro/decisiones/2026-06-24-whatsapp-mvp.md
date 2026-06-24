# WhatsApp MVP

Fecha: 2026-06-24

Decision:
- Canal nuevo vive en `backend/whatsapp/`.
- Outbox propio: `WhatsAppMessage`.
- Config separada: `WhatsAppConfig`, no en `BusinessProfile`.
- Templates separados: `WhatsAppTemplate`.
- Automatizacion simple por evento: `WhatsAppAutomationRule`.
- Provider por adapter: fake, Meta Cloud API, Twilio placeholder.

Razon:
- WhatsApp necesita provider response, status futuro de webhook, template, variables, destinatario y relaciones con reserva/trabajo/cotizacion.
- `NotificationOutbox` actual sirve email; mezclar ambos ensucia contrato.
- Meta Cloud API queda como provider recomendado para MVP, pero el adapter evita lock-in temprano.

Scope MVP:
- Config admin/empleador.
- Templates admin/empleador.
- Historial admin/empleador.
- Manual por template desde endpoint.
- Automaticos: reserva confirmada, trabajo listo, trabajo entregado.
- Cotizacion por WhatsApp marca `sent` si provider acepta envio.

Fuera de scope:
- Webhook inbound.
- Delivered/read reales.
- Texto libre productivo sin ventana inbound.
- Twilio real.
