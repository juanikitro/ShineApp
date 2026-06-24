# WhatsApp MVP

Fecha: 2026-06-24

Cambio:
- Agrega app `whatsapp` con modelos `WhatsAppConfig`, `WhatsAppTemplate`, `WhatsAppAutomationRule`, `WhatsAppMessage`.
- Agrega endpoints:
  - `GET/PATCH /api/whatsapp/config/`
  - `GET/POST/PATCH /api/whatsapp/templates/`
  - `GET/PATCH /api/whatsapp/automation-rules/`
  - `GET /api/whatsapp/messages/`
  - `POST /api/whatsapp/messages/send-manual/`
  - `POST /api/quotes/:id/send-whatsapp/`
- Hook automatico en `POST /api/reservations/:id/confirm/`.
- Hook automatico en `POST /api/work-orders/:id/status/` para `ready` y `delivered`.
- Agrega flush de outbox WhatsApp en `backend/core/maintenance.py`.
- Agrega seccion `WhatsApp` en configuracion frontend.
- Agrega accion WhatsApp en cotizaciones.

Permisos:
- Config, templates, reglas, historial y envio manual usan `EmployerOnly`.
- Envio de cotizacion por WhatsApp usa `EmployerOnly`.

Validacion esperada:
- Backend: `cd backend`; `.\.venv\Scripts\python.exe -m pytest tests/test_whatsapp.py`
- Frontend enfocado: `cd frontend`; `npx vitest run lib/data-loading.test.mjs lib/app-data.test.mjs --maxWorkers=1`
