# WhatsApp: Meta Cloud API directo con numero unico de ShineApp

Fecha: 2026-07-07

Supera a `2026-07-06-whatsapp-produccion-subaccounts.md` (Twilio + subaccounts), que queda descartada.

Decision:
- ShineApp adopta WhatsApp Cloud API DIRECTO de Meta como camino oficial de produccion, sin BSP (sin Twilio, sin 360dialog). Motivo habilitante: Meta levanto el bloqueo de OTP que impedia el alta de developer del dueno.
- Modelo de numero unico: un unico numero propio de ShineApp envia las notificaciones de todos los negocios. El remitente visible es "ShineApp"; el nombre del negocio viaja como primera variable del template.
- El numero debe ser un numero DEDICADO propiedad de ShineApp (idealmente una SIM prepaga local mantenida activa). Al registrarse en Cloud API queda cautivo de la API: NO puede usarse en la app de WhatsApp/WhatsApp Business. Por eso no se usa el numero personal del dueno ni el del cliente.
- El numero del cliente queda intacto: sigue usando su app de WhatsApp Business normal para atender a mano. Coexistence (app + API sobre el mismo numero) NO esta disponible en Meta directo; era el unico valor de un BSP como 360dialog, y en el modelo de numero unico no hace falta.
- Credenciales globales via variables de entorno (token permanente de System User + phone_number_id). El `MetaCloudWhatsAppProvider` ya cae a `settings` cuando la config por negocio esta vacia.
- El provider Twilio (Content API + webhook de status, ya en `development`) queda como fallback inactivo en el codigo, no como camino de produccion.

Razon:
- Con el bloqueo de OTP levantado, Meta directo es viable, gratis en la capa de BSP (solo se pagan las tarifas de conversacion de Meta) y reutiliza el `MetaCloudWhatsAppProvider` existente.
- El numero unico elimina la friccion de onboarding por cliente (sin embedded signup ni verificacion de negocio por cliente) para la fase actual de un solo cliente activo.

Tradeoffs asumidos:
- Branding: los clientes finales ven "ShineApp" como remitente, con el nombre del negocio en el cuerpo del mensaje.
- Quality rating y limites de mensajeria compartidos por todos los negocios sobre ese unico numero (punto unico de falla; aceptable con un cliente, a re-evaluar al escalar).
- Sin bandeja de entrada: las respuestas al numero llegan al webhook pero no hay UI para responder; se orienta al cliente final a escribir al negocio por su canal propio.

Fuera de scope:
- Modelo de numero propio por negocio con branding real (etapa futura si se escala).
- Bandeja de entrada / respuestas manuales dentro de ShineApp.

Endpoints:
- Webhook de status en `GET/POST /api/whatsapp/webhooks/meta/status/`. El `GET` es el handshake de verificacion de Meta (compara `hub.verify_token` con `WHATSAPP_META_WEBHOOK_VERIFY_TOKEN`). El `POST` valida la firma `X-Hub-Signature-256` (HMAC-SHA256 sobre el cuerpo crudo con `WHATSAPP_META_APP_SECRET`) y actualiza `sent/delivered/read/failed` sin degradar estados que llegan fuera de orden.

Los 4 templates (Utility, es_AR) y su orden de variables (el nombre del negocio es `{{1}}`):
- `reservation_confirmed`: `{{1}}` negocio, `{{2}}` cliente, `{{3}}` fecha_turno, `{{4}}` hora_turno, `{{5}}` vehiculo, `{{6}}` servicios.
- `work_ready`: `{{1}}` negocio, `{{2}}` cliente, `{{3}}` vehiculo, `{{4}}` servicios.
- `work_delivered`: `{{1}}` negocio, `{{2}}` cliente, `{{3}}` vehiculo, `{{4}}` servicios.
- `quote_sent`: `{{1}}` negocio, `{{2}}` cliente, `{{3}}` vehiculo, `{{4}}` codigo, `{{5}}` total, `{{6}}` validez.
