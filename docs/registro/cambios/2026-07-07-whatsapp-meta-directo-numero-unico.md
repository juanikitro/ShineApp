# WhatsApp: Meta directo, webhook de status y numero unico

Fecha: 2026-07-07

Cambio:
- ShineApp adopta WhatsApp Cloud API directo de Meta como camino de produccion, con un numero unico propio que envia a todos los negocios (el provider Twilio queda como fallback inactivo). Ver decision `docs/registro/decisiones/2026-07-07-whatsapp-meta-directo-numero-unico.md`.
- Agrega webhook publico `GET/POST /api/whatsapp/webhooks/meta/status/`: el `GET` es el handshake de verificacion (compara `hub.verify_token` con `WHATSAPP_META_WEBHOOK_VERIFY_TOKEN`); el `POST` valida la firma `X-Hub-Signature-256` (HMAC-SHA256 sobre el cuerpo crudo con `WHATSAPP_META_APP_SECRET`) y actualiza `sent/delivered/read/failed` sin degradar estados fuera de orden.
- Agrega el nombre del negocio como primera variable (`negocio`) de los mensajes automaticos (reserva, trabajo, cotizacion) y de los templates seed, para que el cliente final identifique al negocio aunque el remitente visible sea ShineApp.
- Nuevas variables de entorno backend: `WHATSAPP_META_APP_SECRET` y `WHATSAPP_META_WEBHOOK_VERIFY_TOKEN`.
- UI de Configuracion > WhatsApp: nota que aclara que los mensajes salen del numero de ShineApp y que las credenciales por negocio son opcionales.

Validacion esperada:
- Backend: `cd backend`; `py -3 -m pytest tests/test_whatsapp.py`
