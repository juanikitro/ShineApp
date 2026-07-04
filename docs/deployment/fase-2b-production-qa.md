# Fase 2B - guia de verificacion en demo-production

Artifact vivo para verificar en `https://shineapp-web.vercel.app` lo publicado
desde Fase 0/1 hasta Fase 2B.

## Estado de publicacion

| Paso | Estado | Evidencia |
| --- | --- | --- |
| Artifact de QA creado | En curso | Pendiente de commit en PR #197 |
| PR #197 listo para merge | Pendiente | Fase 2B: WhatsApp onboarding operativo |
| Fase 2B en `development` | Pendiente | Merge de PR #197 |
| Release a `main` | Pendiente | PR release `development` -> `main` |
| Deploy demo-production | Pendiente | Workflow `deploy-vercel-demo.yml` |
| Smoke produccion | Pendiente | Web y API publicas |

## URLs

- Web: `https://shineapp-web.vercel.app`
- API health: `https://shineapp-api.vercel.app/api/health/`

## Preparacion

1. Usar credenciales demo vigentes o un usuario admin creado para la demo.
2. Abrir la web publica en una ventana normal.
3. Abrir otra ventana en mobile/responsive para revisar que no haya cortes visuales.
4. No pegar tokens reales de Meta en la prueba de Fase 2B.

## Smoke base

1. Abrir `https://shineapp-web.vercel.app`.
2. Confirmar que la pantalla carga sin error visible.
3. Iniciar sesion.
4. Confirmar que el dashboard abre y los menus principales responden.
5. Abrir `https://shineapp-api.vercel.app/api/health/`.
6. Confirmar respuesta saludable de API y base de datos.

Resultado esperado:

- La web carga.
- El login funciona.
- La API health responde OK.
- No aparece una pantalla blanca ni error de configuracion de API.

## Fase 0/1 - demo vendible vehicular

1. Entrar al dashboard con un negocio demo ya poblado.
2. Confirmar que el producto habla de gestion vehicular.
3. Revisar que existan senales de lavadero, detailing y lubricentro.
4. Abrir Agenda y confirmar turnos/trabajos visibles.
5. Abrir Caja y confirmar movimientos o indicadores.
6. Abrir la turnera publica desde Configuracion > Turnera o el link publico.
7. Confirmar que el flujo de cotizacion/turno publico se entiende para Instagram,
   WhatsApp, referidos o landing.

Resultado esperado:

- El primer pantallazo vende una gestion para negocios vehiculares.
- El demo no parece un negocio generico vacio.
- Agenda, caja, turnera publica y dashboard se ven conectados.

## Fase 2A - negocio vacio guiado

Usar un negocio real vacio o crear uno de prueba sin seed demo.

1. Entrar al dashboard del negocio vacio.
2. Confirmar que aparece el modo `Alta guiada`.
3. Revisar el checklist:
   - Datos del negocio.
   - Servicios vehiculares.
   - Turnera publica.
   - WhatsApp.
   - Primer turno o trabajo.
   - Caja y dashboard.
4. Hacer click en la accion de servicios base.
5. Confirmar que crea servicios iniciales para lavadero, detailing y lubricentro.
6. Volver al dashboard y revisar que el checklist avanza.

Resultado esperado:

- El negocio real no recibe datos demo precargados.
- La primera accion clara es completar la base operativa.
- Los servicios base se crean una sola vez y no duplican nombres existentes.

## Fase 2B - panel nuevo de WhatsApp

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
4. Hacer click en `Preparar WhatsApp demo`.
5. Esperar el toast de exito.
6. Confirmar que el panel pasa a modo `Demo/local`.
7. Confirmar que quedan listos:
   - provider `fake`;
   - canal habilitado;
   - numero visible demo/local;
   - templates base;
   - reglas automaticas con template asignado.
8. Revisar que la configuracion avanzada siga disponible debajo.
9. Revisar que no aparezca token real ni campo Meta completado automaticamente.

Resultado esperado:

- El usuario puede probar WhatsApp sin credenciales externas.
- No se llama a Meta ni a Twilio.
- El panel separa claramente modo demo/local de produccion.
- La configuracion avanzada sigue editable para produccion real.

## Fase 2B - prueba funcional con cotizacion

1. Crear o abrir un cliente con telefono.
2. Crear una cotizacion simple.
3. Enviar la cotizacion por WhatsApp desde el menu de acciones.
4. Volver a Configuracion > WhatsApp.
5. Revisar `Historial WhatsApp`.

Resultado esperado:

- La cotizacion queda enviada o marcada como enviada segun el flujo actual.
- El historial muestra un mensaje con provider `fake`.
- El primer envio del checklist queda cumplido.

## Revision visual

Desktop:

1. Abrir Configuracion > WhatsApp en ancho normal.
2. Confirmar que el panel nuevo no tapa la configuracion avanzada.
3. Confirmar que los cuatro checks entran sin solaparse.
4. Confirmar que botones y textos no se cortan.

Mobile/responsive:

1. Reducir ancho a mobile.
2. Confirmar que el panel pasa a una columna.
3. Confirmar que el boton principal ocupa ancho util.
4. Confirmar que los textos largos no se pisan.

## Criterio de cierre

La fase esta lista para considerar verificada si:

- Deploy demo-production termino OK.
- API health responde OK.
- Web publica permite login.
- Fase 0/1 muestra demo vehicular.
- Fase 2A guia un negocio vacio.
- Fase 2B prepara WhatsApp demo sin tokens reales.
- El panel nuevo se ve correcto en desktop y mobile.
