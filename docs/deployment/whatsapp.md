# WhatsApp Cloud API

Guia para conectar WhatsApp en ShineApp.

## Estado de la implementacion

Backend:
- Config: `GET/PATCH /api/whatsapp/config/`.
- Templates: `GET/POST/PATCH /api/whatsapp/templates/`.
- Reglas automaticas: `GET/PATCH /api/whatsapp/automation-rules/`.
- Historial: `GET /api/whatsapp/messages/`.
- Manual: `POST /api/whatsapp/messages/send-manual/`.
- Cotizacion: `POST /api/quotes/:id/send-whatsapp/`.

Automatismos:
- Reserva confirmada: hook en `POST /api/reservations/:id/confirm/`.
- Trabajo listo: hook en `POST /api/work-orders/:id/status/` cuando `status=ready`.
- Trabajo entregado: hook en `POST /api/work-orders/:id/status/` cuando `status=delivered`.
- Cotizacion enviada por WhatsApp: endpoint explicito de cotizacion.

Provider:
- `meta`: Meta WhatsApp Cloud API real.
- `fake`: dev/test, no llama servicios externos.
- `twilio`: Twilio WhatsApp API; envía el texto renderizado como mensaje (sandbox soportado).

## Variables de entorno backend

Variables opcionales globales:

```env
WHATSAPP_TIMEOUT_SECONDS=10
WHATSAPP_META_API_VERSION=v20.0
WHATSAPP_META_ACCESS_TOKEN=
WHATSAPP_META_PHONE_NUMBER_ID=
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

Mapeo de campos en Configuracion > WhatsApp (no requiere migraciones ni env vars nuevas):
- Provider: `Twilio`.
- Business account ID: **Account SID** de Twilio (empieza con `AC`).
- Token: **Auth Token** de Twilio.
- Phone number ID: numero emisor; acepta `whatsapp:+14155238886`, `+14155238886` o solo digitos.

Sandbox (para probar hoy, sin numero propio):
1. Crear cuenta en Twilio y abrir Messaging > Try it out > Send a WhatsApp message.
2. Anotar el numero sandbox (`+1 415 523 8886`) y el codigo `join <palabras>`.
3. Cada destinatario de prueba debe mandar ese `join <palabras>` por WhatsApp al numero sandbox (opt-in valido por 72 horas, renovable).
4. Cargar SID, token y numero sandbox en Configuracion > WhatsApp y activar el canal.

Limitaciones del MVP con Twilio:
- Se envia el `body_preview` renderizado como texto libre (no usa templates aprobados ni Content API; queda como trabajo futuro).
- En sandbox solo reciben los numeros que hicieron `join`; fuera de la ventana de sesion de 24 h WhatsApp puede exigir template aprobado en numeros de produccion.
- Para produccion real: comprar/registrar numero WhatsApp en Twilio (Twilio gestiona el alta contra Meta via embedded signup, sin registro personal de Meta Developer) y evaluar Content API para templates.

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
- Sin webhook inbound, los estados reales disponibles son principalmente `sent`, `failed` y `dead`; `delivered/read` quedan preparados para futuro webhook.

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
- No hay `delivered/read`: esperado en MVP; falta webhook inbound/provider status.
