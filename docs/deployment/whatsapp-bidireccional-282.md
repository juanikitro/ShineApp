# WhatsApp bidireccional: relevamiento y propuesta para #282

Fecha: 2026-10-22. Base inspeccionada: development `9a250674`.
Fuente de alcance: [issue #282](https://github.com/juanikitro/ShineApp/issues/282),
body actualizado el 2026-10-21 y sus dos comentarios de agosto, leidos completos.
El body vigente amplia el alcance anterior, que excluia entrada.

## Resultado y limites

Existe salida con Meta/Twilio/fake, historial y callbacks de estado. No existe
una vertical de carga entrante. Este diff solo endurece el rechazo de firmas
Twilio sin credencial util y agrega evidencia sintetica; no habilita integracion
real ni selecciona proveedor, identidad o caso de entrada.

La decision historica de julio documentaba Meta directo y numero unico; el
alcance actual vuelve a pedir acuerdo de proveedor y topologia. No se infiere
una nueva decision humana de aquella nota ni se reescribe su razonamiento.

## Vocabulario del contrato

- Estado de salida: callback del proveedor sobre un mensaje enviado.
- Entrada operativa: solicitud que puede terminar en un registro de dominio.
- Actor: usuario vinculado y vigente de ShineApp; un telefono no acredita rol.
- Tenant: negocio del actor autorizado; no se toma del texto enviado.
- Confirmacion: aceptacion explicita de un resumen validado antes de escribir.
- Apertura wa.me: accion del operador; no prueba entrega ni lectura.

## Evidencia y brechas

| Superficie | Implementado / evidencia en repo | Brecha para #282 |
| --- | --- | --- |
| Configuracion y permisos | `backend/whatsapp/views.py`: config, templates e historial usan `EmployerOnly` y `business_from_request`; token write-only en serializer | No hay identidad de remitente WhatsApp vinculada a usuario/negocio ni revocacion |
| Proveedores | `backend/whatsapp/providers.py`: Meta template/texto, Twilio texto/Content API y fake | Tests fake y HTTP simulado no demuestran cuenta, templates aprobados, ventana, opt-in ni entrega real |
| Eventos | `backend/whatsapp/services.py`: reserva confirmada, trabajo listo/entregado; cotizacion explicita | Producto debe elegir primer evento; `send_delay_minutes` existe pero no se usa al despachar |
| Outbox | `send_message` y `flush_whatsapp_outbox`: pending/failed, intentos, sent/dead | Sin claim atomico entre procesos, backoff ni conciliacion de timeout tras aceptacion remota; no garantiza exactly-once |
| Twilio status | Firma HMAC con URL y parametros; busca config por Account SID y mensaje dentro del negocio | Rechazo de token vacio corregido; un SID compartido por varias configs se resuelve con `.first()`, no es routing multi-tenant compartido |
| Meta status | Firma HMAC del cuerpo; handshake; filtro opcional de numero global; busca mensaje por provider/id | No resuelve tenant/actor entrante; si falta metadata no exige numero; unicidad provider/id no esta impuesta por DB |
| Orden y duplicados de status | Ranking impide retroceso secuencial; callback repetido sin cambios no vuelve a guardar | Lectura y guardado no atomicos; no prueba concurrencia; failed tiene precedencia sobre read |
| Recepcion operativa | Meta ignora `messages` y devuelve 200; Twilio solo tiene ruta de status | Sin inbox durable, deduplicacion de entrada, parser, confirmacion, cancelacion, resultado ni UI de carga |
| Trazabilidad | `WhatsAppMessage` conserva negocio, referencias y `created_by` para envio manual | Automatismos no vinculan necesariamente un actor; falta origen/actor/confirmacion/registro de entrada |
| Privacidad | Token write-only; no se usan credenciales reales en pruebas | Respuesta/error crudos de proveedor se guardan y exponen al empleador; falta politica de minimizacion/retencion para entrada |

No se corrigieron esas brechas con contratos inventados: routing compartido,
persistencia nueva y procesamiento concurrente requieren la vertical acordada.

## Decisiones minimas para continuar

Recomendaciones del agente, **pendientes de decision humana**:

| Decision | Recomendacion / ganancia | Alternativa / costo o perdida |
| --- | --- | --- |
| Actor y primer caso | Dueno/empleador vinculado; alta de cliente por texto estructurado. Reusa un flujo pequeno sin stock, caja ni pagos | Reserva: mayor valor operativo, pero requiere cliente, vehiculo, servicio, capacidad, horario y mas efectos; cliente final exige otro contrato de identidad |
| Formato | Texto estructurado, resumen, confirmar/cancelar; validacion determinista | Conversacion guiada: mas estados y recuperacion; audio/adjuntos/IA agregan privacidad, dependencias y costos no aprobados |
| Vinculacion | Iniciada en sesion autenticada de ShineApp y verificada en ambos canales; rol vigente revalidado al confirmar | Numero como identidad unica no alcanza; varios negocios requieren seleccion explicita de contexto verificado |
| Proveedor | Comparar Meta directo/Twilio con cuenta, templates y requisitos reales antes de elegir; ambos adaptadores ya existen | Twilio agrega intermediario/configuracion propia; Meta usa credenciales/routing Meta. Tarifas y restricciones actuales deben verificarse al decidir; no hay cotizacion en este relevamiento |
| Numero/topologia | Resolver propiedad y aislamiento antes de construir routing | Por negocio separa remitentes y responsabilidades pero multiplica altas; compartido simplifica numero pero exige resolver tenant sin ambiguedad y comparte fallos/limites |
| Salida inicial | Candidato: confirmacion de turno, ya cubierto por tests fake | Trabajo listo/entregado o cotizacion: elegir con producto; no activar todos por defecto |
| Entorno y costo | Fake local primero; sandbox y luego numeros controlados solo con autorizacion separada | Ninguna credencial existente se considera segura ni autorizada por presencia en configuracion; #289 coordina su seguridad |

Preguntas a resolver juntas: quien carga y que primer registro; formato y regla
de confirmacion; vinculacion/revocacion y numeros compartidos; evento de salida;
proveedor, numero propio/compartido, responsable, entorno y presupuesto.
No enviar tokens ni telefonos reales para responder estas decisiones.

## Vertical propuesta para revision, no implementada

1. Dueno vincula usuario/negocio desde sesion autenticada; mecanismo y vencimiento
   de la prueba de posesion se acuerdan antes de agregar contrato o persistencia.
2. Callback autentico resuelve canal, deduplica identificador del proveedor y
   obtiene actor/negocio de vinculo vigente. Sin vinculo o con contexto ambiguo,
   no consulta ni escribe datos del negocio.
3. Texto estructurado de alta de cliente usa validaciones del backend existente
   (`backend/customers/serializers.py` y permisos de `backend/customers/views.py`),
   sin crear filas saltando esas reglas. Datos incompletos se aclaran; no se infieren.
4. Devuelve resumen y referencia de confirmacion ligada a actor, tenant y datos;
   cancelacion, vencimiento, repeticion o mensaje fuera de orden no escriben.
5. Al confirmar se revalidan rol, negocio, datos y estado; escritura y marca de
   consumo deben ser atomicas. La creacion no debe disparar pagos ni caja.
6. Devuelve ID verificable en la app y registra origen/actor/resultado minimo.
   Un fallo de respuesta posterior a persistir debe recuperar el mismo ID.
7. Agrega un evento de salida acordado con fake y su estado; sandbox y validacion
   real controlada quedan separados. Definir limites de timeout/reintento antes
   de elegir asincronia; no introducir worker persistente ni migracion automatica.

La propuesta requiere diseno detallado de contrato y datos tras las decisiones;
no prescribe endpoints, tablas, colas ni dependencias nuevas.

## Contratos con #281 y #283

- #281 mantiene `free`, apertura wa.me y log sin confirmar entrega. No migrar
  automaticamente negocios ni reutilizar el log como mensaje entrante.
- #283 muestra configuracion/prerrequisitos de salida segun proveedor; estado de
  onboarding no prueba credenciales, entrega ni autorizacion para entrada. No
  presentar bidireccionalidad como activa hasta validar la vertical.
- #279/#289 coordinan seguridad y credenciales; no se activa ni rota nada aqui.
- #304 sigue postergado: sin restore, backup ni staging en este trabajo.

## Aceptacion y evidencia

| Criterio del issue | Estado de esta entrega |
| --- | --- |
| Proveedor, numero, topologia, costo, responsables, entorno | Pendiente decision humana |
| Un evento de salida y estados verificables | Evidencia fake/mocks en `backend/tests/test_whatsapp.py`; sin entrega real |
| Alta entrante autorizada visible en app | No implementada; propuesta anterior pendiente |
| Remitentes sin vinculo/permiso/otro tenant | No existe receptor operativo; no se afirma aislamiento de entrada. Twilio status tiene prueba de aislamiento |
| Autenticidad y no duplicacion | Firmas positivas/negativas y token vacio cubiertos; callback repetido y salida secuencial cubiertos; sin garantia concurrente/end-to-end |
| Ambiguedad, orden, fallos y recuperacion | Status fuera de orden y fallo/reintento de salida cubiertos; entrada pendiente |
| Confirmacion, actor/origen/resultado | Pendiente en entrada |
| Exito, invalido, cancelacion, permisos, aislamiento, caida | Casos de salida existentes y agregados; cancelacion entrante no cubierta |
| Secretos/telefonos/payloads sensibles | Solo fixtures sinteticos; ningun servicio real contactado por los tests previstos |
| Fake/sandbox y validacion real | Fake/mocks local; sandbox y validacion real no ejecutados |
| Modo gratis disponible | Tests existentes de free se ejecutan junto al modulo; sin migracion automatica |

Riesgos para revision: configuracion sin token podia falsear entrega (mitigado
por 403); timeout remoto puede duplicar salida al reintentar (pendiente
conciliacion); revocacion entre resumen y confirmacion requiere revalidacion;
respuesta perdida tras alta requiere recuperar el registro, no repetirla.
Revertir el guard reabre el problema: ante un falso rechazo investigar la
credencial/URL/firma sin relajar validacion. No hay migraciones en este diff.

## Validacion ejecutada

- Python del entorno ya instalado del repo principal, con cwd en este worktree;
  no se modifico ese entorno ni se cargo `.env`.
- `DATABASE_URL=sqlite:///:memory:`, settings locales, email locmem y variables
  WhatsApp globales vacias en el proceso de test.
- Antes del guard: `python -m pytest tests/test_whatsapp.py -k without_credentials_rejects_forged_signature --tb=short`:
  3 fallos reproducidos (204 en lugar de 403), 45 casos deseleccionados.
- Despues del guard: `python -m pytest tests/test_whatsapp.py --tb=short`:
  **52 passed, 6 warnings in 46.08s**. Warnings de deprecacion de SWIG/ReportLab.
- `py -3 scripts/check_docs.py --write --skip-build`: OK; registros e indices
  regenerados por el script. `git diff --check`: OK.
- Sin Node, suite global, coverage global, build, servidor, Docker, PostgreSQL,
  sandbox, envio real, restore, cambios de secretos ni deploy.

Skills: `grill-with-docs` para separar decisiones de hechos y precisar actor,
tenant y confirmacion; entrevistas opcionales adaptadas a la orden de autonomia.
`systematic-debugging` guio reproduccion antes del guard y verificacion posterior.
`orchestration` se uso para coordinar alcance y revision. `brainstorming` se
consulto para la propuesta; no se implemento una arquitectura sin aprobar.
No se uso frontend/UI/Supabase: no se modifican esas superficies ni servicios.
