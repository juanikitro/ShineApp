# Glosario de dominio

## Cotizacion grupal

Documento comercial de un unico cliente que agrupa hasta 25 autos. Puede quedar solo como cotizacion o agendarse creando una reserva hija por cada auto.

## Linea de auto

Entrada dentro de una cotizacion grupal que representa un auto existente o un auto nuevo del cliente. Tiene servicios, agenda tentativa o reservada, notas y subtotal propios.

## Embudo comercial

Lectura comercial por cotizacion individual o grupal. Cada cotizacion cuenta una sola vez, aunque una cotizacion grupal cree varias reservas hijas. La carga de operacion se mide por orden de trabajo, no por cotizacion.

## Modo del canal (WhatsApp)

COMO sale un mensaje de WhatsApp. Vive en `WhatsAppConfig.mode` por negocio: `paid` (Meta Cloud API, envio server-side) o `free` (wa.me, el operador abre WhatsApp desde su propia sesion; la app solo deja traza en el Historial). Es ortogonal a la [Politica de despacho (WhatsApp)].

## Politica de despacho (WhatsApp)

QUE hace la app cuando pasa un evento. Vive en `WhatsAppAutomationRule.dispatch` por evento: `manual` (solo se ofrece el boton), `notify` (al pasar el evento aparece un toast accionable "Enviar / Descartar") o `automatic` (dispara solo: en modo pago lo envia el servidor, en modo gratis intenta abrir wa.me y si el navegador bloquea el popup degrada al toast de notify). Aplica a `reservation_confirmed`, `work_ready` y `work_delivered`; `quote_sent` es siempre manual. No hay estado "apagado": para silenciar un evento se desactiva su template. Es ortogonal al [Modo del canal (WhatsApp)].

## Reserva hija

Reserva individual creada desde una linea de auto de una cotizacion grupal. Conserva su propio cupo, solapamiento, trabajo, deuda y cobro; no existe cobro grupal en este modelo.

## Fecha limite operativa de una reserva

Ultimo dia acordado para que el vehiculo permanezca en el negocio. Coincide con la fecha de egreso cuando fue informada; en una reserva de un solo dia, coincide con la fecha reservada.

## Reserva vencida

Reserva cuya fecha limite operativa ya paso y que todavia no fue entregada o no esta totalmente cobrada. Deja de estar vencida solo cuando ambas condiciones se cumplen; las reservas canceladas no participan.
