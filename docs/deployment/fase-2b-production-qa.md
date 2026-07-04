# Fases 0 a Beta 1B - guia de verificacion en demo-production

Artifact vivo para probar en `https://shineapp-web.vercel.app` todo lo publicado
desde Fase 0 hasta Beta 1B.

## Estado de publicacion

| Paso | Estado | Evidencia |
| --- | --- | --- |
| Fase 0/1 en `development` | Completado | PR #195 |
| Fase 2A en `development` | Completado | PR #196 |
| Fase 2B en `development` | Completado | PR #197, merge commit `de284d1` |
| Release a `main` | Completado | PR #198, merge commit `6ba9e0d` |
| Deploy demo-production Fase 2B/2C | Completado | Workflow `deploy-vercel-demo.yml`, run `28711067373` |
| Smoke publico Fase 2B/2C | Completado | Web 200, API health `database=ok` |
| Fase 2C | Publicado en `main` | PR #200 y release PR #201 |
| Beta 1A en `development` | Completado | PR #204 |
| Release Beta 1A a `main` | Completado | PR #205, merge commit `e89220e` |
| Deploy demo-production Beta 1A | Completado | Workflow `deploy-vercel-demo.yml`, run `28720568410` |
| Smoke Beta 1A post-release | Completado | Web 200 con CTA, API health/deep OK, maintenance 403 sin secret |
| Sync `main` -> `development` | Completado | PR #207 |
| Beta 1B en `development` | En este PR | Guardrails operativos para signup publico y trials |

## URLs

- Web: `https://shineapp-web.vercel.app`
- API health: `https://shineapp-api.vercel.app/api/health/`
- QA artifact: `docs/deployment/fase-2b-production-qa.md`

## Preparacion

1. Usar credenciales demo vigentes o un usuario admin creado para la demo.
2. Probar primero en desktop.
3. Repetir los puntos visuales clave en mobile/responsive.
4. No pegar tokens reales de Meta en Fase 2B.
5. Si se crea un negocio de prueba, usar un nombre reconocible, por ejemplo
   `QA Vehicular Fase 2`.
6. Para Beta 1A/Beta 1B, usar un email disposable/controlado y no cargar datos reales
   de clientes.

## Smoke base de produccion

1. Abrir `https://shineapp-web.vercel.app`.
2. Confirmar que la web retorna 200 y muestra pantalla de login.
3. Abrir `https://shineapp-api.vercel.app/api/health/`.
4. Confirmar `status=ok` y `database=ok`.
5. Iniciar sesion.
6. Confirmar que Dashboard, Agenda, Servicios, Cotizaciones, Caja y
   Configuracion abren sin pantalla blanca.

Resultado esperado:

- La web carga.
- La API health responde OK.
- Login funciona.
- La navegacion principal responde.

Evidencia sugerida:

- Screenshot del login o dashboard.
- Copia del JSON de health sin secretos.

## Smoke post-release Beta 1A

Objetivo a verificar: confirmar que el release de Beta 1A quedo desplegado y
que el signup publico esta visible antes de crear cuentas de prueba.

1. Abrir `https://shineapp-web.vercel.app`.
2. Confirmar que el login muestra `Probar gratis 14 dias`.
3. Hacer click en `Probar gratis 14 dias`.
4. Confirmar que el formulario muestra `Prueba gratuita por 14 dias`.
5. Abrir `https://shineapp-api.vercel.app/api/health/`.
6. Confirmar `status=ok` y `database=ok`.
7. Confirmar que la respuesta de health incluye un header `X-Request-Id`.
8. Opcional sin datos reales: abrir `/api/health/?deep=1` y confirmar que
   responde OK.

Resultado esperado:

- La web ya contiene el CTA publico de prueba.
- La API sigue saludable despues del deploy.
- No hace falta crear una cuenta real para completar este smoke tecnico.

Evidencia sugerida:

- Screenshot del login con `Probar gratis 14 dias`.
- Screenshot o copia del JSON de health sin secretos.

Evidencia tecnica ya verificada post-release:

- `Deploy Vercel Demo` run `28720568410`: OK.
- Web publica: HTTP 200 y CTA `Probar gratis 14 dias` visible en HTML.
- API health: HTTP 200, `status=ok`, `checks.database=ok`.
- API deep health: HTTP 200, `status=ok`, `checks.database=ok`,
  `checks.storage=ok`.
- API maintenance sin secret: HTTP 403 esperado.

## Fase 0 - foco de producto vehicular

Objetivo a verificar: la app debe sentirse pensada para negocios vehiculares,
no como CRM generico.

1. Entrar al dashboard.
2. Revisar textos principales, pasos guiados y labels visibles.
3. Confirmar que el nicho inicial aparece como lavadero, detailing y
   lubricentro.
4. Abrir Servicios.
5. Confirmar que sectores o servicios usan vocabulario vehicular.
6. Abrir Agenda.
7. Confirmar que el flujo tiene sentido para turnos/trabajos de vehiculos.
8. Abrir Cotizaciones.
9. Confirmar que el flujo sirve para presupuestar servicios vehiculares.

Resultado esperado:

- La propuesta visible es gestion para negocios vehiculares.
- Las superficies principales no parecen genericas o de otro rubro.
- El usuario entiende que ShineApp apunta a lavadero/detailing/lubricentro.

Evidencia sugerida:

- Screenshot del dashboard.
- Screenshot de Servicios o Agenda con referencias vehiculares.

## Fase 1 - demo vendible con datos precargados

Objetivo a verificar: el demo debe mostrar una experiencia vendible, con datos
suficientes para entender valor sin cargar todo manualmente.

Usar un negocio demo ya poblado.

1. Entrar al dashboard del negocio demo.
2. Confirmar que hay indicadores y actividad visible.
3. Abrir Agenda.
4. Confirmar turnos, trabajos o estados cargados.
5. Abrir Servicios.
6. Confirmar servicios de lavadero, detailing y lubricentro.
7. Abrir Caja.
8. Confirmar movimientos o indicadores monetarios.
9. Abrir Configuracion > Turnera.
10. Confirmar que la turnera publica esta lista para compartir.
11. Abrir el link publico de turnera/landing.
12. Confirmar que el flujo puede usarse desde landing, Instagram, WhatsApp,
    referidos o demo por WhatsApp.
13. Abrir Configuracion > WhatsApp.
14. Confirmar que el negocio demo tiene configuracion segura o simulada; no debe
    requerir tokens reales para mostrar el flujo.

Resultado esperado:

- El demo no arranca vacio.
- Dashboard, agenda, servicios, turnera, WhatsApp y caja cuentan una historia
  comercial coherente.
- El vendedor puede mostrar valor en pocos minutos.

Evidencia sugerida:

- Screenshot del dashboard demo.
- Screenshot de Agenda.
- Screenshot de la turnera publica.
- Screenshot de Caja o WhatsApp demo.

## Fase 2A - alta guiada para negocio real vacio

Objetivo a verificar: un usuario real no recibe datos demo; recibe un negocio
vacio guiado paso a paso.

Usar un negocio nuevo o vacio, sin correr `seed_demo`.

1. Entrar al dashboard del negocio vacio.
2. Confirmar que aparece `Alta guiada`.
3. Revisar el checklist:
   - Datos del negocio.
   - Servicios vehiculares.
   - Turnera publica.
   - WhatsApp.
   - Primer turno o trabajo.
   - Caja y dashboard.
4. Abrir el paso de Datos del negocio.
5. Cargar o revisar nombre, contacto y slug.
6. Volver al dashboard y confirmar que el progreso cambia si corresponde.
7. Ejecutar la accion de servicios base.
8. Confirmar que crea servicios iniciales para:
   - lavadero;
   - detailing;
   - lubricentro.
9. Volver a Servicios.
10. Ejecutar nuevamente la accion si queda visible.
11. Confirmar que no duplica servicios ya existentes.
12. Volver al dashboard y confirmar que el paso de Servicios avanza.

Resultado esperado:

- El negocio real arranca vacio.
- La app propone una siguiente accion clara.
- Los servicios base se crean una sola vez.
- El checklist se calcula desde datos reales, no desde estado artificial.

Evidencia sugerida:

- Screenshot del dashboard con `Alta guiada`.
- Screenshot antes/despues de crear servicios base.
- Screenshot del checklist avanzado.

## Fase 2B - onboarding WhatsApp demo/local

Objetivo a verificar: el usuario puede preparar WhatsApp para pruebas sin Meta,
sin Twilio y sin credenciales externas.

Usar un negocio de prueba sin configuracion real de Meta.

1. Ir a Configuracion > WhatsApp.
2. Revisar el panel `WhatsApp listo para probar`.
3. Confirmar que muestra:
   - badge de modo (`Sin modo activo`, `Demo/local` o `Produccion Meta`);
   - progreso del checklist;
   - conexion activa;
   - templates base;
   - reglas automaticas;
   - primer envio.
4. Confirmar que debajo sigue disponible `Configuracion avanzada`.
5. Hacer click en `Preparar WhatsApp demo`.
6. Esperar el toast de exito.
7. Confirmar que el panel cambia a `Demo/local`.
8. Confirmar que la conexion queda con:
   - provider `fake`;
   - canal habilitado;
   - numero visible demo/local;
   - codigo pais default.
9. Confirmar que se crearon templates base para:
   - turno confirmado;
   - trabajo listo;
   - trabajo entregado;
   - cotizacion enviada.
10. Confirmar que las reglas automaticas quedan activas y con template asignado.
11. Confirmar que ningun token real aparece completado automaticamente.

Resultado esperado:

- La preparacion de WhatsApp se resuelve con un click.
- El modo demo/local queda claro.
- No se llama a Meta ni a Twilio.
- La configuracion avanzada queda disponible para produccion real.

Evidencia sugerida:

- Screenshot antes de preparar WhatsApp demo.
- Screenshot despues, con badge `Demo/local`.
- Screenshot de templates/reglas.

## Fase 2B - prueba funcional con cotizacion

Objetivo a verificar: el provider `fake` permite probar el flujo operativo de
WhatsApp sin salir a servicios externos.

1. Crear o abrir un cliente con telefono.
2. Crear una cotizacion simple.
3. Enviar la cotizacion por WhatsApp desde acciones.
4. Volver a Configuracion > WhatsApp.
5. Revisar `Historial WhatsApp`.

Resultado esperado:

- La cotizacion queda enviada o marcada como enviada segun el flujo actual.
- El historial muestra un mensaje con provider `fake`.
- El checklist de WhatsApp marca cumplido el primer envio.

Evidencia sugerida:

- Screenshot de la accion de enviar WhatsApp en Cotizaciones.
- Screenshot del Historial WhatsApp con provider `fake`.

## Fase 2C - primer turno y primer cobro guiados

Objetivo a verificar: un negocio real vacio puede completar el primer recorrido
operativo sin adivinar pantallas: crear un turno/trabajo y registrar el primer
cobro desde la guia del dashboard.

Usar un negocio de prueba con Fase 2A y 2B listas o casi listas.

1. Entrar al Dashboard.
2. Confirmar que el panel `Alta guiada` muestra el bloque
   `Primer recorrido operativo`.
3. Si el paso `Primer turno o trabajo` esta pendiente, hacer click en
   `Crear primer turno`.
4. Confirmar que se abre el modal de nueva reserva con el dia actual
   precargado.
5. Cargar cliente, vehiculo y al menos un servicio.
6. Guardar la reserva.
7. Confirmar que la Agenda muestra el turno creado.
8. Volver al Dashboard.
9. Confirmar que el paso `Primer turno o trabajo` queda marcado como listo.
10. Si el paso `Primer cobro` esta pendiente y existe un trabajo con saldo,
    hacer click en `Cobrar primer trabajo`.
11. Confirmar que se abre el modal `Cobrar trabajo de la reserva`.
12. Revisar importe, tipo y medio de pago.
13. Guardar el cobro.
14. Confirmar que Caja muestra el cobro.
15. Volver al Dashboard.
16. Confirmar que `Primer cobro` queda listo y los indicadores economicos se
    actualizan.
17. Si todavia no existe trabajo cobrable, confirmar que el boton de caja guia a
    `Crear turno primero` en vez de abrir una caja vacia.

Resultado esperado:

- El usuario puede empezar desde el dashboard.
- La app no lo manda a Caja si todavia no hay trabajo cobrable.
- Agenda, Caja y Dashboard quedan conectados por datos reales.
- No se crean cobros automaticos sin confirmacion del usuario.

Evidencia sugerida:

- Screenshot del bloque `Primer recorrido operativo`.
- Screenshot del modal de nueva reserva abierto desde el dashboard.
- Screenshot del modal de cobro abierto desde el dashboard.
- Screenshot de Caja con el cobro registrado.

## Regresion visual obligatoria

Desktop:

1. Dashboard: no debe haber cards solapadas ni textos cortados.
2. Servicios: el banner/accion de servicios base debe verse alineado.
3. Configuracion > Turnera: controles y links publicos deben seguir accesibles.
4. Configuracion > WhatsApp: el panel nuevo no debe tapar la configuracion
   avanzada.
5. Caja: indicadores y botones principales deben seguir operativos.
6. Dashboard: el bloque `Primer recorrido operativo` debe quedar alineado y sin
   duplicar acciones confusas.

Mobile/responsive:

1. Dashboard: checklist en una columna sin textos pisados.
2. Servicios: accion principal con ancho util.
3. Configuracion > WhatsApp: checks en una columna.
4. Boton `Preparar WhatsApp demo`: visible, tocable y sin texto cortado.
5. Navegacion lateral/topbar: usable sin tapar contenido.
6. Bloque `Primer recorrido operativo`: acciones en una columna y botones de
   ancho completo.

Resultado esperado:

- No hay overlap.
- No hay textos cortados en botones.
- Los paneles nuevos mantienen el estilo CRM claro y sobrio.

## Beta 1A - signup publico libre por 14 dias

Objetivo a verificar: cualquier negocio puede pedir una prueba gratuita de 14
dias desde el login, sin invitacion previa ni tarjeta.

1. Abrir `https://shineapp-web.vercel.app`.
2. Hacer click en `Probar gratis 14 dias`.
3. Confirmar que el formulario muestra `Prueba gratuita por 14 dias`.
4. Cargar un negocio de prueba controlado:
   - Negocio: `QA Beta 1A <fecha>`.
   - Rubro: `Detailing`.
   - Responsable: `QA Owner`.
   - Email: email disposable/controlado.
   - WhatsApp/telefono, ciudad y pais: valores de prueba.
   - Contrasena: temporal y guardada fuera de banda.
5. Hacer click en `Crear prueba gratis`.
6. Confirmar que la app entra automaticamente al Dashboard.
7. Abrir Mi perfil y confirmar que figura como prueba activa.
8. Abrir Configuracion > Negocio y confirmar que el negocio esta vacio y guiado.
9. Abrir Dashboard y confirmar que aparece `Alta guiada`.
10. Opcional API: consultar `/api/auth/me/` con el token de ese usuario y
    confirmar `subscription_type=trial`, `trial_expired=false` y
    `trial_days_remaining` cercano a 14.

Resultado esperado:

- El signup publico crea un negocio real vacio de prueba.
- La duracion visible y backend es 14 dias.
- No se solicita invitacion, tarjeta ni pago.
- El onboarding real vacio sigue guiando la primera configuracion.

Evidencia sugerida:

- Screenshot del login con `Probar gratis 14 dias`.
- Screenshot del formulario de prueba.
- Screenshot del Dashboard con `Alta guiada` tras crear la cuenta.

## Beta 1B - guardrails operativos de trials

Objetivo a verificar: el signup publico debe quedar operable para una beta
abierta sin activar billing ni bloquear clientes por defecto.

Usar un superusuario de Django admin y un negocio trial descartable.

1. Crear un trial publico desde el login, como en Beta 1A.
2. Entrar a Django admin.
3. Abrir `Perfiles de negocio`.
4. Confirmar que la lista muestra:
   - estado trial;
   - dias trial restantes;
   - owner/email;
   - negocio activo.
5. Filtrar por `Trial activo`, `Trial por vencer`, `Trial vencido` y `Premium`.
6. Seleccionar un perfil trial descartable y ejecutar
   `Extender trials seleccionados 7 dias`.
7. Confirmar que `trial_ends_at` avanza y que el negocio sigue activo.
8. Preparar o seleccionar un trial vencido descartable.
9. Ejecutar `Suspender negocios con trial vencido`.
10. Confirmar que solo se suspenden negocios trial vencidos y que los tokens de
    esos usuarios quedan invalidados.
11. Abrir `Registros de auditoria`.
12. Buscar accion `trial_signup`.
13. Confirmar que el evento queda vinculado al negocio y que la metadata muestra
    dominio de email, duracion del trial y origen `public_signup`.
14. Confirmar que el audit log no contiene passwords, tokens ni secretos.
15. Confirmar que `DJANGO_ENFORCE_SUBSCRIPTION_ACCESS` sigue apagado salvo
    decision explicita de activar bloqueo por trial vencido.

Resultado esperado:

- El operador puede ver y filtrar trials sin consultar la DB a mano.
- Puede extender pruebas o suspender vencidos con acciones explicitas.
- El signup publico deja trazabilidad operativa sin datos sensibles.
- No se agrega cobro, Stripe ni billing portal.
- No se bloquean trials vencidos globalmente si el feature flag sigue apagado.

Evidencia sugerida:

- Screenshot de `Perfiles de negocio` con columnas de trial.
- Screenshot del filtro por estado de prueba.
- Screenshot de un `AuditLog` `trial_signup` sin datos sensibles.

## Matriz de cierre

Marcar cada item antes de considerar verificada la publicacion:

| Area | Resultado esperado | Estado |
| --- | --- | --- |
| Web publica | Carga login/dashboard | Pendiente de QA manual |
| API health | `status=ok`, `database=ok` | Verificado por deploy |
| Fase 0 | Producto enfocado en vehicular | Pendiente de QA manual |
| Fase 1 | Demo vendible precargado | Pendiente de QA manual |
| Fase 2A | Negocio vacio guiado | Pendiente de QA manual |
| Fase 2B | WhatsApp demo/local preparado | Pendiente de QA manual |
| Fase 2C | Primer turno y primer cobro guiados | Pendiente de QA manual |
| Smoke Beta 1A post-release | CTA visible y API health OK | Verificado post-release |
| Beta 1A | Signup publico 14 dias | Pendiente de QA manual |
| Beta 1B | Guardrails operativos de trials | Pendiente de QA manual |
| Visual desktop | Sin overlap ni cortes | Pendiente de QA manual |
| Visual mobile | Una columna y controles tocables | Pendiente de QA manual |

## Incidencias

Registrar aca cualquier problema encontrado:

| Fecha | Fase | Pantalla | Problema | Severidad | Estado |
| --- | --- | --- | --- | --- | --- |
| - | - | - | - | - | - |

## Criterio final

La publicacion queda aceptada si:

- Smoke publico esta OK.
- Fase 0 comunica nicho vehicular.
- Fase 1 permite vender el demo sin carga manual.
- Fase 2A guia un negocio real vacio sin seed demo.
- Fase 2B prepara WhatsApp demo/local sin tokens reales.
- Fase 2C permite crear primer turno y registrar primer cobro desde la guia.
- Beta 1A permite crear una prueba publica libre de 14 dias.
- Beta 1B deja visibilidad, auditoria y acciones admin para operar trials.
- Dashboard, Servicios, Turnera, WhatsApp y Caja se ven correctos en desktop y
  mobile.
