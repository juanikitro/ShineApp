# WhatsApp: modo del canal vs politica de despacho (dos ejes ortogonales)

Fecha: 2026-07-14

Complementa a `2026-07-07-whatsapp-meta-directo-numero-unico.md` (modo pago / Meta directo). No la reemplaza: aquel define COMO se envia en pago; esta separa dos conceptos que estaban mezclados.

Contexto:
- El booleano `WhatsAppAutomationRule.enabled` cargaba dos significados a la vez ("mostrar el boton" y "enviar solo"), distintos segun el modo del negocio. Eso ocultaba los botones en modo pago y ataba la visibilidad a la automatizacion.
- El boton inline de la cotizacion siempre llamaba al camino server-side, ignorando el modo del canal.

Decision: separar dos ejes ortogonales.
- Modo del canal (`WhatsAppConfig.mode`, por negocio): `paid` (Meta Cloud API, envio server-side) o `free` (wa.me, el operador abre WhatsApp desde su sesion). Define COMO sale el mensaje.
- Politica de despacho (`WhatsAppAutomationRule.dispatch`, por evento): `manual` | `notify` | `automatic`, default `manual`. Define QUE hace la app cuando pasa el evento. Reemplaza al booleano `enabled`.

Reglas:
- La politica aplica a `reservation_confirmed`, `work_ready` y `work_delivered`. `quote_sent` es SIEMPRE manual (sin selector; solo se configura su template).
- `manual`: solo se ofrece el boton.
- `notify`: al pasar el evento aparece un toast accionable persistente ("Paso X — [Enviar] [Descartar]"). Enviar respeta el modo del canal (free -> wa.me; paid -> envio server-side on-demand).
- `automatic`: dispara solo. En pago lo envia el hook server-side existente. En gratis intenta `window.open(wa.me)`; si el navegador bloquea el popup (open fuera del gesto del usuario) degrada al toast de `notify`.
- Sin estado "apagado": para silenciar un evento se desactiva su template.

Visibilidad del boton (independiente de la politica, en AMBOS modos): un boton de WhatsApp de un evento se muestra sii hay template activo del evento + canal usable (free: `mode=free`; paid: `is_enabled`) + destinatario con telefono. Se elimina la dependencia de `enabled`/`isFreeEventEnabled` para visibilidad. El boton "manual" de la ficha del cliente queda solo en modo gratis (un texto libre no se entrega de forma confiable por la API de Meta fuera de la ventana de 24 h).

No doble-envio: en `paid + automatic` envia solo el hook de backend; el frontend no dispara. En `manual`/`notify` el backend no encola y el envio sale del frontend (boton o toast). Se mantiene el early-return de modo free en `enqueue_automated_message`.

Migracion de datos (`enabled` -> `dispatch`, el modo vive en `WhatsAppConfig` por negocio):
- `paid` + `enabled=true` -> `automatic`.
- Cualquier otro caso (free, o no enabled, o sin config) -> `manual`.
- Reversible: `enabled = (dispatch == "automatic")`.
- El negocio en produccion esta en modo gratis, por lo que todo resuelve a `manual`.

Endpoints de envio on-demand (modo pago), atados a la fuente, con la misma forma que el de cotizacion:
- `POST /api/reservations/{id}/send-whatsapp/` (evento `reservation_confirmed`; body vacio).
- `POST /api/work-orders/{id}/send-whatsapp/` (body `{ "event": "work_ready" | "work_delivered" }`).
- Respuesta `201 {"message": <WhatsAppMessage>}` / error `400 {"detail": "..."}`. Reusan `reservation_variables`/`work_order_variables` + `create_message` + `send_message` y exigen template activo del evento.
- Ya existente: `POST /api/quotes/{id}/send-whatsapp/`.

Reenvio: si ya existe un `WhatsAppMessage` enviado para ese evento + fuente (FK reservation/work_order/quote), el boton lo indica y pide confirmar antes de reenviar. El endpoint on-demand no deduplica: un reenvio es una accion explicita del operador.

Tradeoffs asumidos:
- El envio on-demand permite reintentos explicitos; el control de "ya enviado" vive en el frontend, no en el backend.
- `free + automatic` depende del popup del navegador; el fallback a `notify` evita perder el envio.

Fuera de scope:
- Politica de despacho para `quote_sent` (siempre manual) y para el boton "manual" de la ficha.
- Bandeja de entrada / respuestas manuales (ya fuera de scope en la ADR de Meta directo).
