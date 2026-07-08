# WhatsApp Cloud API

Guia para conectar WhatsApp en ShineApp.

## Estado de la implementacion

Backend:
- Config: `GET/PATCH /api/whatsapp/config/` (incluye `mode`: `paid`/`free`).
- Templates: `GET/POST/PATCH /api/whatsapp/templates/`.
- Reglas automaticas: `GET/PATCH /api/whatsapp/automation-rules/`.
- Historial: `GET /api/whatsapp/messages/`.
- Manual: `POST /api/whatsapp/messages/send-manual/`.
- Cotizacion: `POST /api/quotes/:id/send-whatsapp/`.
- Log modo gratis: `POST /api/whatsapp/free/log/`.

Automatismos:
- Reserva confirmada: hook en `POST /api/reservations/:id/confirm/`.
- Trabajo listo: hook en `POST /api/work-orders/:id/status/` cuando `status=ready`.
- Trabajo entregado: hook en `POST /api/work-orders/:id/status/` cuando `status=delivered`.
- Cotizacion enviada por WhatsApp: endpoint explicito de cotizacion.

Provider:
- `meta`: Meta WhatsApp Cloud API real.
- `fake`: dev/test, no llama servicios externos.
- `twilio`: Twilio WhatsApp API; envia texto libre o Content API para templates aprobados.
- `wame`: solo snapshot en el historial de los envios del modo gratis (no es un provider de envio server-side).

Modo del canal (`WhatsAppConfig.mode`):
- `paid` (default): envio automatico server-side por la API (Meta/Twilio). Es el flujo historico; requiere credenciales y `Canal habilitado`.
- `free`: no usa la API de Meta. El operador abre WhatsApp (wa.me) con el mensaje ya escrito y confirma el envio desde su propia sesion.

## Modo gratis (wa.me)

Alternativa sin costo ni API de Meta. En Configuracion > WhatsApp se elige `Modo del canal = Gratis (wa.me)`; en ese modo no hacen falta credenciales.

Como funciona:
- Se activan modulos (turno confirmado, listo para entregar, cotizacion) y cada uno tiene un mensaje de texto libre editable con variables `{variable}`. La UI muestra las variables disponibles por modulo. Ademas hay un mensaje manual generico en la ficha del cliente.
- El boton de WhatsApp aparece en la cotizacion, la turnera, el tablero de trabajos y la ficha del cliente. Abre `https://wa.me/<digitos>?text=<mensaje renderizado>` directo (no usa el servidor).
- En modo gratis, los envios automaticos server-side quedan deshabilitados: `enqueue_automated_message()` y `send_quote_whatsapp()` no generan mensaje.

Variables por modulo:
- Turno confirmado: `cliente`, `fecha_turno`, `hora_turno`, `vehiculo`, `servicios`, `negocio`.
- Listo para entregar: `cliente`, `vehiculo`, `servicios`, `negocio`.
- Cotizacion: `cliente`, `vehiculo`, `codigo`, `total`, `validez`, `negocio`.
- Manual (ficha de cliente): `cliente`, `negocio`.

Historial:
- Cada envio gratis se registra con `POST /api/whatsapp/free/log/` (`EmployerOnly`, scoping por negocio): crea un `WhatsAppMessage` con `message_type=free_text`, `provider=wame`, `status=sent`.
- Limitacion: el modo gratis no puede confirmar entrega ni lectura (abre el WhatsApp del operador). El estado real disponible es "enviado/link abierto".

## Variables de entorno backend

Variables opcionales globales:

```env
WHATSAPP_TIMEOUT_SECONDS=10
WHATSAPP_META_API_VERSION=v20.0
WHATSAPP_META_ACCESS_TOKEN=
WHATSAPP_META_PHONE_NUMBER_ID=
WHATSAPP_STATUS_CALLBACK_URL=
```

Regla:
- Para SaaS con un numero por cliente, preferir configurar `access_token` y `phone_number_id` desde la UI de cada negocio.
- Para demo o instalacion con un numero global, usar `WHATSAPP_META_ACCESS_TOKEN` y `WHATSAPP_META_PHONE_NUMBER_ID`.
- Nunca cargar tokens en variables `NEXT_PUBLIC_*`.
- Nunca pegar tokens reales en docs, issues, logs ni commits.

## Obtener credenciales Meta

1. Entrar a [Meta for Developers](https://developers.facebook.com/).
2. Crear o abrir una app de tipo Business.
3. Agregar el producto WhatsApp.
4. En WhatsApp > API Setup, identificar:
   - `Phone number ID`.
   - `WhatsApp Business Account ID`.
   - access token temporal para pruebas.
5. Para produccion, crear un token permanente:
   - Entrar a Meta Business Settings.
   - Ir a Users > System users.
   - Crear o usar un system user.
   - Asignar permisos sobre la app y el WhatsApp Business Account.
   - Generar token con permisos de WhatsApp necesarios para enviar mensajes.
6. Guardar el token solo en backend o en la configuracion segura del negocio.

Campos que ShineApp necesita:
- Provider: `Meta Cloud API`.
- Numero visible: el numero de WhatsApp mostrado al cliente.
- Phone number ID: valor de Meta API Setup.
- Business account ID: WABA ID de Meta.
- Token: token de acceso server-side.
- Codigo pais default: por ejemplo `+54`.

## Twilio (sandbox y produccion)

Alternativa a Meta directo cuando no se puede completar el alta de Meta Developer o se prefiere un intermediario.

Decision operativa: ShineApp usa una cuenta Twilio padre y un subaccount por cliente. Ver [WhatsApp producción con subaccounts Twilio](../registro/decisiones/2026-07-06-whatsapp-produccion-subaccounts.md).

Mapeo de campos en Configuracion > WhatsApp:
- Provider: `Twilio`.
- Business account ID: **Account SID** de Twilio (empieza con `AC`).
- Token: **Auth Token** de Twilio.
- Phone number ID: numero emisor; acepta `whatsapp:+14155238886`, `+14155238886` o solo digitos.

Sandbox (para probar hoy, sin numero propio):
1. Crear cuenta en Twilio y abrir Messaging > Try it out > Send a WhatsApp message.
2. Anotar el numero sandbox (`+1 415 523 8886`) y el codigo `join <palabras>`.
3. Cada destinatario de prueba debe mandar ese `join <palabras>` por WhatsApp al numero sandbox (opt-in valido por 72 horas, renovable).
4. Cargar SID, token y numero sandbox en Configuracion > WhatsApp y activar el canal.

Produccion con subaccount:
1. Upgrade de la cuenta Twilio padre de ShineApp a pago (prepago).
2. Crear el subaccount del cliente desde la consola de Twilio.
3. Registrar el sender de WhatsApp del cliente en Twilio Console > Messaging > Senders > WhatsApp senders > Register a WhatsApp sender.
4. Durante embedded signup, el login de Facebook debe ser con la cuenta o rol de administrador de negocio del cliente, nunca con la cuenta del dueno de ShineApp.
5. Si Meta exige Meta Business Verification del cliente, planificar que puede demorar dias.
6. Cargar Account SID, Auth Token y numero emisor del subaccount en Configuracion > WhatsApp del negocio.

Content API:
1. En Twilio Content Template Builder, crear los 4 templates: `reservation_confirmed`, `work_ready`, `work_delivered`, `quote_sent`.
2. Usar categoria Utility e idioma `es_AR`.
3. Usar variables numeradas (`{{1}}`, `{{2}}`, etc.) en el mismo orden que `variables_schema` en ShineApp.
4. Si el template de Twilio usa variables con nombre en vez de numeradas, el mapeo posicional de ShineApp no calza.
5. Someter cada template a aprobacion y esperar estado aprobado antes de activar la regla automatica correspondiente.
6. En cada `WhatsAppTemplate` de ShineApp, completar `Content SID (Twilio)` con el SID aprobado (`HX...`). Si queda vacio, Twilio usa texto libre como fallback; esto cubre sandbox y casos dentro de la ventana de 24 h.

Webhook de status:
- Endpoint backend: `POST /api/whatsapp/webhooks/twilio/status/`.
- Configuracion recomendada: setear `WHATSAPP_STATUS_CALLBACK_URL` con la URL publica del endpoint bajo el host de backend correspondiente. Alternativamente, configurar Status Callback manualmente en Twilio Console.
- El endpoint es publico y no usa auth de ShineApp, pero valida `X-Twilio-Signature` contra el Auth Token del subaccount cuyo Account SID llega en el payload.
- Si `WHATSAPP_STATUS_CALLBACK_URL` no esta configurado, el comportamiento actual no cambia y Twilio no enviara `delivered/read` a ShineApp por esta via.

Limitaciones del MVP con Twilio:
- Content API esta soportado, pero es opcional y requiere `twilio_content_sid` cargado por template.
- En sandbox solo reciben los numeros que hicieron `join`; fuera de la ventana de sesion de 24 h WhatsApp puede exigir template aprobado en numeros de produccion.
- La creacion de subaccounts y el alta del sender siguen siendo pasos manuales en Twilio Console.

## Configurar WhatsApp del cliente

1. Verificar que el cliente tenga Business Manager y WhatsApp Business Account.
2. Conectar o crear el numero de WhatsApp del negocio en Meta.
3. Confirmar display name y verificacion requerida por Meta.
4. Crear templates Utility para los eventos iniciales:
   - `reservation_confirmed`
   - `work_ready`
   - `work_delivered`
   - `quote_sent`
5. Esperar aprobacion de Meta.
6. En ShineApp, entrar como empleador/admin a Configuracion > WhatsApp.
7. Cargar provider, numero, IDs y token.
8. Activar `Canal habilitado`.
9. Crear en ShineApp los templates con el nombre exacto aprobado por Meta.
10. Activar reglas automaticas y asignar cada template.

Variables sugeridas por template:
- Turno confirmado: `cliente`, `fecha_turno`, `hora_turno`, `vehiculo`, `servicios`.
- Trabajo listo/finalizado: `cliente`, `vehiculo`, `servicios`, `estado`.
- Cotizacion enviada: `cliente`, `vehiculo`, `codigo`, `total`, `validez`.

El campo `Variables` en ShineApp se carga separado por comas y debe respetar el orden aprobado en el template de Meta. Ejemplo:

```text
cliente, fecha_turno, hora_turno, vehiculo, servicios
```

## Uso en ShineApp

Configuracion:
- Configuracion > WhatsApp.
- Solo usuarios con permiso `EmployerOnly`.
- El token se escribe, pero no se devuelve en las respuestas de API.
- Primer arranque: usar `Preparar WhatsApp demo` para activar provider `fake`,
  crear templates base y vincular reglas automaticas sin credenciales externas.
- Produccion: cargar Meta Cloud API manualmente en la configuracion avanzada y
  reemplazar los templates demo por los nombres aprobados por Meta.

Templates:
- Crear un template por evento.
- `Nombre provider` debe coincidir con el template aprobado en Meta.
- `Preview` es la version que ShineApp guarda para auditoria y previsualizacion.
- `Variables` define que valores se mandan al provider.

Automaticos:
- En Configuracion > WhatsApp > Envios automaticos, activar cada evento.
- Sin regla activa o sin template activo, el backend no genera mensaje.
- Los mensajes automaticos se crean como `pending` y se envian despues del commit de DB.
- `backend/core/maintenance.py` tambien procesa pendientes con `flush_whatsapp_outbox`.

Cotizaciones:
- En Cotizaciones, usar accion `WhatsApp`.
- Si el provider acepta el envio, la cotizacion pasa a `sent`.
- El mensaje queda en Historial WhatsApp.

Manual:
- El endpoint existe: `POST /api/whatsapp/messages/send-manual/`.
- El MVP frontend todavia no incluye modal manual generico para cliente/reserva.
- Usar templates para mensajes fuera de ventana inbound. Texto libre queda reservado para una etapa con webhook inbound y ventana de 24 horas.

Historial:
- Configuracion > WhatsApp > Historial WhatsApp.
- Muestra destinatario, evento, provider, estado, fecha y error si fallo.
- Con webhook de status Twilio configurado, `delivered/read` pueden actualizarse desde Twilio. Sin `WHATSAPP_STATUS_CALLBACK_URL`, los estados reales disponibles siguen siendo principalmente `sent`, `failed` y `dead`.

## Smoke test recomendado

Con provider fake:
1. Configurar provider `fake`.
2. Activar canal.
3. Crear template `quote_sent`.
4. Enviar una cotizacion por WhatsApp.
5. Verificar que la cotizacion quede `sent` y aparezca un mensaje `sent` en historial.

Con Meta real:
1. Configurar `meta`, `phone_number_id` y token.
2. Crear template aprobado por Meta con variables en orden.
3. Activar una regla automatica.
4. Confirmar una reserva de prueba con telefono E.164 valido o normalizable.
5. Verificar mensaje `sent` en ShineApp y entrega en WhatsApp Manager.

## Troubleshooting

- `WhatsApp no esta habilitado para este negocio`: activar canal en Configuracion > WhatsApp.
- `Falta configurar token o phone_number_id`: cargar token y Phone number ID o setear env vars backend.
- Error de Meta por template: revisar nombre exacto, idioma y variables en el mismo orden.
- No aparece mensaje automatico: revisar regla activa, template activo y telefono del cliente.
- Mensaje queda `failed`: revisar `last_error` en Historial WhatsApp.
- Webhook Twilio responde 403: la firma `X-Twilio-Signature` no coincide; revisar Auth Token del subaccount, URL publica exacta y proxy HTTPS.
- Webhook Twilio responde 404: no hay configuracion Twilio con ese Account SID o no existe mensaje con ese Message SID para el negocio.
- Mensaje no baja de `read` a `sent`: esperado; el webhook ignora statuses viejos que llegan tarde para no degradar el historial.
- No hay `delivered/read`: revisar `WHATSAPP_STATUS_CALLBACK_URL` o la configuracion manual del Status Callback en Twilio.
