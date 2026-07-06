# WhatsApp: provider Twilio funcional (MVP sandbox)

Fecha: 2026-07-06

Cambio:
- Implementa `TwilioWhatsAppProvider` en `backend/whatsapp/providers.py` (antes stub que devolvia error).
- Envia el texto renderizado (`rendered_body`) como Body via `POST /2010-04-01/Accounts/{SID}/Messages.json` con Basic auth, tanto para mensajes template como texto libre.
- Mapeo de config existente sin migraciones: `business_account_id` = Account SID, `access_token` = Auth Token, `phone_number_id` = numero emisor (acepta `whatsapp:+1...`, `+1...` o digitos).
- Errores de Twilio quedan en `last_error` del mensaje (mismo manejo que el provider Meta).
- Documenta el flujo sandbox y el mapeo en `docs/deployment/whatsapp.md`.

Limitaciones:
- No usa templates aprobados ni Content API (trabajo futuro); en sandbox solo reciben numeros con `join` vigente.

Validacion esperada:
- Backend: `cd backend`; `.\.venv\Scripts\python.exe -m pytest tests/test_whatsapp.py`
