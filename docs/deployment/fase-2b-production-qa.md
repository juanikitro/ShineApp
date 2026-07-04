# Fases 0 a 2B - guia de verificacion en demo-production

Artifact vivo para probar en `https://shineapp-web.vercel.app` todo lo publicado
desde Fase 0 hasta Fase 2B.

## Estado de publicacion

| Paso | Estado | Evidencia |
| --- | --- | --- |
| Fase 0/1 en `development` | Completado | PR #195 |
| Fase 2A en `development` | Completado | PR #196 |
| Fase 2B en `development` | Completado | PR #197, merge commit `de284d1` |
| Release a `main` | Completado | PR #198, merge commit `6ba9e0d` |
| Deploy demo-production | Completado | Workflow `deploy-vercel-demo.yml`, run `28711067373` |
| Smoke publico | Completado | Web 200, API health `database=ok` |

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

## Regresion visual obligatoria

Desktop:

1. Dashboard: no debe haber cards solapadas ni textos cortados.
2. Servicios: el banner/accion de servicios base debe verse alineado.
3. Configuracion > Turnera: controles y links publicos deben seguir accesibles.
4. Configuracion > WhatsApp: el panel nuevo no debe tapar la configuracion
   avanzada.
5. Caja: indicadores y botones principales deben seguir operativos.

Mobile/responsive:

1. Dashboard: checklist en una columna sin textos pisados.
2. Servicios: accion principal con ancho util.
3. Configuracion > WhatsApp: checks en una columna.
4. Boton `Preparar WhatsApp demo`: visible, tocable y sin texto cortado.
5. Navegacion lateral/topbar: usable sin tapar contenido.

Resultado esperado:

- No hay overlap.
- No hay textos cortados en botones.
- Los paneles nuevos mantienen el estilo CRM claro y sobrio.

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
- Dashboard, Servicios, Turnera, WhatsApp y Caja se ven correctos en desktop y
  mobile.
