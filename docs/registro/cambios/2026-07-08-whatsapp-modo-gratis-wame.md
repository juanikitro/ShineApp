# WhatsApp: modo gratis (wa.me) como alternativa a la API paga

Fecha: 2026-07-08

Contexto:
- El canal WhatsApp existente envia server-side por Meta/Twilio (modo "pago"), que hoy no esta operativo en produccion. Se agrega un modo "gratis" que no depende de la API de Meta: abre WhatsApp (wa.me) con el mensaje ya escrito y el operador confirma el envio desde su propia sesion.

Cambio (backend):
- `WhatsAppConfig.mode` (`paid` default / `free`) y provider `wame` para el snapshot del mensaje (`backend/whatsapp/models.py`, migracion `0003`).
- `WhatsAppConfigSerializer` expone `mode` (read/write).
- Gate en `services.py`: en modo `free`, `enqueue_automated_message()` y `send_quote_whatsapp()` no envian por servidor (el modo pago queda intacto).
- Endpoint `POST /api/whatsapp/free/log/` (`EmployerOnly`, scoping por negocio): registra en el Historial el envio gratis (`message_type=free_text`, `provider=wame`, `status=sent`). No confirma entrega real.

Cambio (frontend):
- `whatsappUrl(raw, text?)` acepta mensaje prellenado (`?text=`).
- Nuevo `frontend/lib/whatsapp-free.ts`: variables por evento (`FREE_EVENT_VARIABLES`), render de template `{var}`, armado del link wa.me y helpers de modo/regla.
- Configuracion > WhatsApp: selector de modo (Gratis/Paga), oculta credenciales en modo gratis, ayuda de variables por modulo, y la seccion de automatismos pasa a "Modulos con boton de WhatsApp" (turno confirmado, listo para entregar, cotizacion).
- Botones de WhatsApp en modo gratis: cotizacion, turnera + tablero de trabajos (quick actions) y ficha de cliente (mensaje manual). Abren wa.me directo y loguean en el Historial (fire-and-forget).

Modulos y variables:
- `reservation_confirmed`: cliente, fecha_turno, hora_turno, vehiculo, servicios, negocio.
- `work_ready`: cliente, vehiculo, servicios, negocio.
- `quote_sent`: cliente, vehiculo, codigo, total, validez, negocio.
- `manual`: cliente, negocio.

Limitaciones:
- El modo gratis no confirma entrega/lectura (abre el WhatsApp del operador). El Historial solo registra que se abrio el link.

Validacion:
- Backend: `cd backend`; `.\.venv\Scripts\python.exe -m pytest tests/test_whatsapp.py`; `manage.py check`.
- Frontend: `npx vitest run lib/contact-links.test.mjs lib/whatsapp-free.test.mjs --maxWorkers=1`; `npx tsc --noEmit`.
