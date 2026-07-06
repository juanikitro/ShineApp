# Estado De Demo

Estado: lista para una demo publica comercial con limites. Supabase, Vercel web, Vercel API, migraciones, seed demo, healthcheck, login, llamadas API con DB, assets estaticos Next y archivos estaticos de Django admin fueron validados el 2026-05-18.

## Recursos

- Proyecto frontend Vercel: `shineapp-web` (`prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`), vinculado localmente
- Proyecto backend Vercel: `shineapp-api` (`prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`), vinculado localmente
- Team Vercel: `juanikitros-projects` (`team_SU2ZYRqjIjG8JhFn2pc1NVxi`)
- Proyecto Supabase: `shineapp-demo` (`cdzqcpwbsfyeeigecqwr`)
- Region Supabase: `sa-east-1`
- URL Supabase: `https://cdzqcpwbsfyeeigecqwr.supabase.co`
- Bucket Storage: `shineapp-media`, privado

## URLs

- URL productiva frontend: `https://shineapp-web.vercel.app`
- URL productiva backend: `https://shineapp-api.vercel.app`
- Healthcheck backend: `https://shineapp-api.vercel.app/api/health/`
- Ultimo deployment frontend inspeccionado: `dpl_3HtxEZCLGEh8B7gPxWTKTfULuJUK`
- Ultimo deployment backend inspeccionado: `dpl_4DqrsccG8GP6WqPDGtAUsd7ZW7BY`

## Estado Actual

- DB: `GET /api/health/` retorna `status=ok` y `database=ok` contra Supabase.
- Migraciones: aplicadas a la base demo Supabase el 2026-05-18.
- Storage/media: el bucket privado `shineapp-media` existe y S3 `head_bucket` retorno OK. Los flujos UI de upload todavia necesitan una prueba manual demo antes de vender flujos con mucha media.
- Env vars Vercel: las env vars productivas estan configuradas para ambos proyectos. Las env vars preview pueden necesitar configuracion acotada por branch desde el Dashboard si se vuelven a usar deploys preview.
- Seed demo: aplicado contra Supabase el 2026-05-18. Los usuarios demo de app `admin` y `empleado` estan listos. Esta corrida no creo un superadmin de Django admin.
- Estaticos: los assets estaticos Next retornan 200; la pagina Django admin retorna 200; CSS de Django admin bajo `/static/admin/...` retorna 200.
- Healthcheck: backend expone `GET /api/health/` publico, incluyendo check de conexion DB.
- Smoke de navegador: el frontend publico loguea mediante el backend publico y carga recursos respaldados por DB con respuestas 200.
- Usuario demo: docs locales mencionan usernames demo y passwords demo default; compartir credenciales reales por fuera de banda y rotarlas antes de produccion real.

## Evidencia De Demo Vendible Fase 1

- Trial signup existe como `POST /api/auth/trial-signup/` publico en `backend/config/urls.py`. Cualquier negocio puede pedir una prueba gratuita libre de 14 dias. `TrialSignupSerializer` crea `BusinessAccount`, `BusinessProfile` con `subscription_type=trial`, fechas trial, membership al group empleador y `UserProfile`; `TrialSignupView` retorna token y contexto de usuario.
- La UI de login tiene modo trial en `frontend/lib/page-support.tsx`. Llama a `/auth/trial-signup/`, guarda el token devuelto y entra a la app sin un paso extra de login.
- `GET /api/auth/me/` retorna el mismo contexto tenant propiedad del backend: negocio, rol, `can_view_economy`, `subscription_type`, fechas trial y estado trial.
- Los empleadores pueden crear usuarios empleados mediante `POST /api/auth/employees/`; los empleados creados reciben rol `empleado`, pueden loguearse y reciben `can_view_economy=false`.
- Economia sigue bloqueada por backend. `can_view_economy` es true solo para `empleador`; endpoints de finance/cash/debt/quote/material/supplier/tool history estan cubiertos por tests de empleado `403`. El frontend tambien oculta secciones de empleador/economia para usuarios empleados.
- Todavia no hay bloqueo de cuenta por trials vencidos, por diseno. `trial_expired` es informativo en Fase 1.
- No existen Stripe, billing portal, planes reales ni automatizacion de pagos en Fase 1. `subscription_type` es un estado interno/demo y no debe venderse como billing.
- Beta 1B agrega guardrails operativos sin cambiar ese contrato: cada signup
  publico deja un `AuditLog` `trial_signup` vinculado al negocio, Django admin
  permite filtrar trials activos/por vencer/vencidos, ver owner/dias restantes,
  extender pruebas 7 dias y suspender negocios con trial vencido. El throttling
  `signup` sigue configurado por `DJANGO_THROTTLE_SIGNUP_RATE` en produccion.
- Beta 1C hace visible el lifecycle del trial en el Dashboard del owner:
  prueba activa, por vencer o vencida. La UI no bloquea el negocio ni agrega
  billing; ofrece copiar un mensaje manual de continuidad y, si
  `NEXT_PUBLIC_TRIAL_UPGRADE_URL` esta configurada, abre ese canal comercial.
- Beta 1D agrega seguimiento comercial manual en Django admin: la seccion
  `Seguimiento de trials` lista solo negocios en prueba, permite registrar
  estado, ultimo contacto, proximo seguimiento y notas internas. No expone esos
  datos al cliente ni cambia `subscription_type`.

## Smoke End-To-End Del Dia De Demo

Correr esto antes de un walkthrough comercial despues de deployar cambios de signup, rotar credenciales demo o cambiar auth/env vars.

1. Abrir `https://shineapp-web.vercel.app`.
2. Elegir `Solicitar prueba`.
3. Crear un negocio trial descartable con datos no cliente:
   - business: `Demo Trial <date>`
   - industry: `Detailing`
   - owner: `Demo Owner`
   - email: un disposable controlado o plus-address
   - phone/city/country: valores seguros de demo
   - password: password temporal generado y guardado fuera de banda
4. Resultado esperado: la app loguea automaticamente. Confirmar que la shell carga sin pedir credenciales de nuevo.
5. Confirmar contexto tenant backend con el token devuelto/guardado:

   ```powershell
   $ApiRoot = "https://shineapp-api.vercel.app/api"
   $Token = "<trial-owner-token>"
   Invoke-RestMethod "$ApiRoot/auth/me/" -Headers @{ Authorization = "Token $Token" }
   ```

   Esperado: business slug/name pertenece al nuevo negocio trial, role es `empleador`, `can_view_economy` es `true`, `subscription_type` es `trial` y `trial_ends_at` esta presente.
6. En la app, ir a settings/users y crear un empleado:
   - username: `demo-operario-<date>`
   - password: password temporal generado y guardado fuera de banda
   - email: vacio o email de test controlado
7. Cerrar sesion y loguearse como ese empleado. Esperado: rol `empleado`; superficies de economia/settings no disponibles en la UI.
8. Confirmar bloqueo backend de economia para el token de empleado:

   ```powershell
   $EmployeeToken = "<employee-token>"
   try {
       Invoke-WebRequest "$ApiRoot/cash/daily/" -Headers @{ Authorization = "Token $EmployeeToken" } -UseBasicParsing
   } catch {
       [int]$_.Exception.Response.StatusCode
   }
   ```

   Esperado: `403` con el mensaje de permisos para informacion economica.
9. Despues del walkthrough, rotar/eliminar credenciales del empleado descartable y mantener o desactivar el negocio trial segun seguimiento comercial.
10. Para revisar guardrails Beta 1B, entrar al Django admin con un superusuario:
    - En `Perfiles de negocio`, filtrar por `estado de prueba`.
    - Confirmar que el negocio creado muestra owner y dias trial.
    - Si es un negocio descartable, usar acciones admin para extenderlo 7 dias
      o suspenderlo solo si ya esta vencido.
    - En `Registros de auditoria`, buscar `trial_signup` y confirmar que no
      contiene passwords ni tokens.
11. Para revisar Beta 1C, volver al Dashboard del owner trial:
    - Confirmar que el banner de prueba aparece arriba de `Alta guiada`.
    - Usar `Copiar pedido` y verificar que el mensaje no contenga secretos.
    - Si `NEXT_PUBLIC_TRIAL_UPGRADE_URL` esta configurada, probar
      `Coordinar continuidad`.
12. Para revisar Beta 1D, entrar al Django admin:
    - Abrir `Seguimiento de trials`.
    - Confirmar que aparece el trial creado y que no aparecen negocios premium.
    - Cargar estado comercial, proximo seguimiento y una nota interna sin
      datos sensibles.
    - Probar una accion masiva de seguimiento sobre un trial descartable y
      confirmar que el plan sigue como `trial`.

## Limitaciones De Free Tier

- Supabase free tier es aceptable para demo pero no debe tratarse como durabilidad productiva.
- Vercel serverless es aceptable para demo de bajo trafico, no para workers persistentes o jobs largos.
- Las access keys S3 de Storage bypassean RLS y deben quedar solo en backend.

## Antes De Mostrar A Clientes

- Usar `https://shineapp-web.vercel.app` como URL demo publica.
- Verificar `/api/health/` antes de una demo en vivo si la API fue redeployada.
- Correr `scripts/deploy/smoke-test.ps1` si cambia alguna env var de Vercel.
- Correr el Smoke End-To-End Del Dia De Demo anterior despues de cualquier cambio de auth, signup o rol/permiso.
- Validar un flujo de upload/logo/documento o ejecutar la prueba manual de media en `manual-steps.md` antes de demoear flujos media/PDF.
- Confirmar credenciales demo por fuera de banda y confirmar que sean temporales. No mostrar ni pegar passwords reales en la llamada.
- Si se usan usuarios seed demo, preferir passwords rotados para `admin`, `empleado` y `recepcion`. No usar passwords default en demos para clientes salvo que la base sea descartable y el riesgo se haya aceptado explicitamente.
- Presentar el trial como prueba operativa libre de 14 dias, sin tarjeta y sin cargo. No describir `subscription_type` como billing cliente.
- Configurar `NEXT_PUBLIC_TRIAL_UPGRADE_URL` solo si ya existe un canal
  comercial publico para continuidad del trial; usar una URL `https://` de
  WhatsApp, agenda o landing, nunca secretos.
- Eliminar el proyecto Vercel accidental llamado `backend` para evitar confusion operativa.

## Riesgos Demo Conocidos

- HSTS preload/subdomains no esta habilitado intencionalmente hasta confirmar dominios finales.
- URLs de media privada dependen de URLs S3 firmadas; validar flujos logo/avatar/documento despues del deploy.
- No existe worker en background para trabajo largo.
- Vercel serverless es aceptable para esta demo, no un servidor Django persistente.
- La configuracion de env preview no esta completamente normalizada porque Vercel requirio una branch Git para algunas escrituras de env preview. Las env vars production demo estan configuradas.
- Un proyecto Vercel accidental llamado `backend` se creo durante el primer intento fallido de deploy. Debe eliminarse manualmente desde Vercel Dashboard si ya no se necesita.
