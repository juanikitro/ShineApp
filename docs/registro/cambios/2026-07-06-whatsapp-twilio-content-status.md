# WhatsApp: Twilio Content API y webhook de status

Fecha: 2026-07-06

Cambio:
- El provider Twilio soporta Content API cuando el template de ShineApp tiene `twilio_content_sid`; si esta vacio, conserva el envio por texto libre (`Body`).
- Agrega `WHATSAPP_STATUS_CALLBACK_URL` para configurar `StatusCallback` en los envios Twilio sin hacerlo manualmente por numero.
- Agrega webhook publico `POST /api/whatsapp/webhooks/twilio/status/` para actualizar `sent`, `delivered`, `read` y fallos desde Twilio con validacion `X-Twilio-Signature`.
- Registra la decision operativa de cuenta Twilio padre de ShineApp mas subaccounts por cliente.

Validacion esperada:
- Backend: `cd backend`; `.\.venv\Scripts\python.exe -m pytest tests/test_whatsapp.py`
