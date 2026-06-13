# Pasos Manuales Despues De La Demo Publica

La demo publica esta deployada. Estos pasos manuales quedan pendientes antes de mostrar flujos con mucha media a clientes o tratar el setup como produccion.

## 1. Crear Proyecto Supabase

- Que: crear un proyecto demo dedicado. Hecho: `shineapp-demo` / `cdzqcpwbsfyeeigecqwr`.
- Donde: Supabase Dashboard.
- Por que: datos demo/prod no deben usar SQLite local ni Docker Postgres.
- Valor a copiar: project ref, region, connection string de base de datos.
- Validar: el dashboard del proyecto Supabase carga y la informacion de conexion DB esta disponible.

## 2. Copiar `DATABASE_URL`

- Que: copiar la URL Postgres para la API. Hecho para la demo publica.
- Donde: Supabase Dashboard, seccion Connect.
- Por que: configuracion productiva Django requiere `DATABASE_URL`.
- Valor a copiar: connection string del pooler, preferentemente transaction pooler para Vercel.
- Validar: `https://shineapp-api.vercel.app/api/health/` retorna `database=ok`.

## 3. Crear Bucket Storage

- Que: crear `shineapp-media`. Hecho como bucket privado.
- Donde: Supabase Storage.
- Por que: logos, avatares y documentos subidos deben persistir fuera del filesystem de Vercel.
- Valor a copiar: nombre del bucket.
- Validar: el bucket aparece en Storage y acepta un upload de prueba.

## 4. Habilitar Storage S3 Y Crear Claves Server

- Que: crear S3 access key id y secret. Hecho manualmente para la demo publica.
- Donde: configuracion de Supabase Storage S3.
- Por que: Django usa `django-storages` mediante la API compatible con S3 de Supabase.
- Valor a copiar: endpoint URL, region, access key id, secret key.
- Validar: las env vars de Vercel API incluyen todos los valores `SUPABASE_S3_*`.
- Nota: rotar secretos demo antes de produccion porque los valores iniciales se compartieron por chat durante el setup.

## 5. Configurar Proyecto Web Vercel

- Que: crear `shineapp-web`. Hecho: `prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`.
- Donde: Vercel Dashboard.
- Por que: deployar Next.js separado de la API Django.
- Valor a setear: Root Directory `frontend`, `NEXT_PUBLIC_API_URL=https://shineapp-api.vercel.app/api`.
- Validar: `https://shineapp-web.vercel.app` retorna 200 y el bundle deployado contiene `shineapp-api.vercel.app/api`, no localhost ni placeholders.

## 6. Configurar Proyecto API Vercel

- Que: crear `shineapp-api`. Hecho: `prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`.
- Donde: Vercel Dashboard.
- Por que: correr Django API como app Python serverless para demo.
- Valor a setear: Root Directory `backend`, `DJANGO_SETTINGS_MODULE=config.settings_production`, database, CORS/CSRF, Supabase Storage, env vars de email.
- Validar: la configuracion del proyecto Vercel muestra root `backend`; `https://shineapp-api.vercel.app/api/health/` retorna `status=ok`; ningun secreto es visible en archivos del repo.

## 7. Confirmar Dominios Finales

- Que: decidir dominios reales de web y API. Los dominios demo actuales son aliases provistos por Vercel.
- Donde: dominios de proyecto en Vercel.
- Por que: allowlists de host y CORS/CSRF del navegador dependen de origenes exactos.
- Valores a setear:
  - `DJANGO_ALLOWED_HOSTS=shineapp-api.vercel.app`
  - `CORS_ALLOWED_ORIGINS=https://shineapp-web.vercel.app`
  - `CSRF_TRUSTED_ORIGINS=https://shineapp-web.vercel.app`
  - `NEXT_PUBLIC_API_URL=https://shineapp-api.vercel.app/api`
- Validar: no queda ningun valor localhost en env vars productivas de Vercel.

## 7.1 Configurar Env Vars Preview De Vercel Si Se Necesitan Preview Deploys

- Que: agregar todas las env vars preview listadas en `docs/deployment/vercel.md`.
- Donde: Vercel Dashboard, configuracion de proyecto, seccion Environment Variables.
- Por que: las env vars production demo estan configuradas, pero escrituras preview pueden requerir una branch Git en Vercel.
- Valor a copiar: valores desde Supabase Dashboard y secretos backend generados. No copiar secretos a archivos del repo.
- Validar: `npx vercel env ls --cwd backend` y `npx vercel env ls --cwd frontend` muestran los nombres de variables requeridas.

## 7.2 URLs Publicas Demo

- Que: los aliases demo publicos ya estan asignados.
- Donde: Vercel Dashboard, proyectos `shineapp-api` y `shineapp-web`.
- Por que: clientes necesitan una URL sin autenticacion previa.
- Valor a copiar: frontend `https://shineapp-web.vercel.app`; API `https://shineapp-api.vercel.app`.
- Validar: `scripts/deploy/smoke-test.ps1 -WebBaseUrl https://shineapp-web.vercel.app -ApiBaseUrl https://shineapp-api.vercel.app/api` retorna OK desde un request normal no autenticado.
- Riesgo si se cambia mal: el login frontend puede romperse si `NEXT_PUBLIC_API_URL`, CORS o CSRF dejan de coincidir.

## 7.3 Limpiar Proyecto Vercel Accidental

- Que: eliminar el proyecto Vercel no intencional llamado `backend` si no se usa.
- Donde: Vercel Dashboard, proyecto `backend`.
- Por que: un primer deploy fallido por CLI vinculo la carpeta backend a un proyecto nuevo antes de relinkearlo a `shineapp-api`.
- Valor a copiar: ninguno.
- Validar: la lista de proyectos Vercel muestra solo `shineapp-api` y `shineapp-web` para esta demo.
- Riesgo si se omite: confusion operativa, aunque no se identifico riesgo de datos de app.

## 8. Correr Migraciones Y Seed Demo Opcional

- Que: correr `migrate`; opcionalmente `seed_demo`. Hecho para DB demo el 2026-05-18 con `seed_demo --yes --allow-default-passwords`.
- Donde: shell local confiable o comando one-off aprobado con env productivo.
- Por que: schema y datos demo deben crearse intencionalmente, no en cada cold start serverless.
- Valor a copiar: ninguno.
- Validar: admin/API pueden autenticarse contra la base Supabase despues de habilitar el alias publico de API.

## 8.1 Refrescar Credenciales Seed Demo Para Walkthroughs Con Clientes

- Que: si se usan usuarios seed demo en un walkthrough con clientes, rotar `admin`, `empleado` y `recepcion` fuera de los passwords demo default.
- Donde: shell local confiable con el `DATABASE_URL` demo esperado, o comando one-off aprobado apuntando a la base Supabase demo.
- Por que: `seed_demo` puede crear datos realistas utiles, pero las credenciales locales default son conocidas de desarrollo y no deben usarse como acceso demo publico de larga vida.
- Valor a setear: passwords temporales generados fuera del repo.
- Forma de comando:

  ```powershell
  cd backend
  $env:SEED_DEMO_ADMIN_PASSWORD = "<generated-admin-password>"
  $env:SEED_DEMO_EMPLOYEE_PASSWORD = "<generated-employee-password>"
  .\.venv\Scripts\python.exe manage.py seed_demo --yes
  ```

  Si `backend/.venv` no esta disponible, usar `py -3 manage.py seed_demo --yes`.
- Validar:
  - `admin` puede loguearse desde la URL web publica.
  - `empleado` puede loguearse pero no puede ver superficies de economia/settings.
  - `GET /api/auth/me/` con cada token retorna negocio, rol y `can_view_economy` esperados.
  - `GET /api/cash/daily/` con token de empleado retorna HTTP 403.
- Riesgo si se omite: una demo visible a clientes puede mantener passwords demo conocidos.
- Nota: usar `--allow-default-passwords` solo para corridas smoke descartables locales/demo donde el riesgo es explicito. No usarlo como camino normal para demo con clientes.

## 9. Validar Media Privada

- Que: subir un logo/avatar/documento despues del deploy publico.
- Donde: UI de ShineApp contra `https://shineapp-web.vercel.app`.
- Por que: el bucket privado Supabase usa URLs S3 firmadas, no URLs publicas de objeto.
- Valor a copiar: ninguno.
- Validar: el archivo subido persiste despues de recargar y el PDF de cotizacion generado puede renderizar el logo del negocio.
- Riesgo si se omite: la demo puede parecer correcta hasta el primer flujo de upload/display de media.

## 10. Rotar Secretos Demo Antes De Produccion Real

- Que: rotar `DJANGO_SECRET_KEY`, password de base Supabase si hace falta y access keys Supabase S3.
- Donde: Supabase Dashboard y Vercel Dashboard.
- Por que: los secretos demo iniciales se manejaron interactivamente durante el setup y no deben convertirse en secretos productivos de larga vida.
- Valor a copiar: valores nuevos solo en env vars backend de Vercel.
- Validar: redeploy API, healthcheck, login y validacion de media.
- Riesgo si se omite: riesgo evitable de exposicion de secretos en un futuro entorno comercial.

## 11. Configurar Secretos De Deploy En GitHub Actions

- Que: agregar los secretos CI/CD requeridos para `.github/workflows/deploy-vercel-demo.yml`.
- Donde: configuracion del repositorio GitHub, Secrets and variables, Actions; y el entorno `demo-production`.
- Por que: GitHub Actions necesita credenciales Vercel CLI, los dos project ids de Vercel y un set acotado de credenciales DB para migracion.
- Secretos de repositorio a setear:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID=team_SU2ZYRqjIjG8JhFn2pc1NVxi`
  - `VERCEL_FRONTEND_PROJECT_ID=prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ`
  - `VERCEL_BACKEND_PROJECT_ID=prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC`
- Secretos de entorno a setear en `demo-production`:
  - `DATABASE_URL`
  - `DJANGO_MIGRATION_SECRET_KEY`
  - `DJANGO_SUPERUSER_USERNAME`
  - `DJANGO_SUPERUSER_PASSWORD`
  - `DJANGO_SUPERUSER_EMAIL` (opcional)
- Secreto de entorno opcional:
  - `SMOKE_TEST_TOKEN` si los smoke tests deben verificar un endpoint autenticado.
- Ramas de deploy del entorno:
  - solo `main`.
- Validar: correr el workflow manualmente con `workflow_dispatch`; debe pasar el check inicial de secretos, correr checks locales, correr migraciones, deployar ambos proyectos Vercel y pasar smoke tests.
- Riesgo si se omite: el workflow de deploy falla antes de instalar dependencias.

No agregar el `DJANGO_SECRET_KEY` real, claves Supabase S3 ni secretos SMTP a GitHub. Esos valores pertenecen al env productivo del proyecto Vercel API y Vercel los consume durante el build/deploy cloud.

## 12. Proteger `main`

- Que: forzar cambios solo por PR y requerir el gate CI antes de mergear.
- Donde: configuracion del repositorio GitHub, Branches o Rulesets.
- Por que: todo PR a `main` debe pasar el mismo gate completo antes de poder deployar.
- Valores a setear:
  - Requerir pull request antes de mergear.
  - Requerir status checks exitosos antes de mergear: `Validate / ci-required`.
  - Requerir merge queue, o requerir ramas actualizadas antes de mergear si merge queue no esta disponible.
  - Requerir resolucion de conversaciones antes de mergear.
  - No permitir bypass de la configuracion anterior.
  - Bloquear force pushes y borrado de ramas.
- Validar: abrir o inspeccionar un PR hacia `main`; GitHub debe bloquear merge hasta que `Validate / ci-required` pase en el ultimo commit o merge queue group.
- Riesgo si se omite: pushes directos o PRs stale pueden llegar a `main` y disparar deploy productivo sin el gate completo.

## 12.1 Habilitar Auto-Merge Para El Workflow De Docs

- Que: habilitar la opcion "Allow auto-merge" en la configuracion del repositorio.
- Donde: Settings > General > Pull Requests > Allow auto-merge (checkbox).
- Por que: el ruleset de `main` bloquea push directo de GitHub Actions (limitacion de GitHub para repos personales). El workflow `regen-docs.yml` abre un PR desde `chore/regen-docs` y activa auto-merge para que se mergee automaticamente cuando pase el CI. Sin esta opcion, el comando `gh pr merge --auto` falla y el PR queda abierto para merge manual.
- Validar: mergear cualquier PR a `main`; debe aparecer un PR "chore: regenerar changelog e indice" que se mergea solo despues de que el CI pase (~5 min).
- Riesgo si se omite: los docs (CHANGELOG.md e indices) quedan desactualizados en `main` y el job `Validate / docs` falla en cada push hasta que el PR se mergee manualmente.

## 13. Hacer Que GitHub Actions Sea El Unico Camino De Deploy Productivo Automatico

- Que: deshabilitar o bypassear los deploys Git productivos built-in de Vercel para `shineapp-api` y `shineapp-web`, o configurarlos para saltearse cuando GitHub Actions sea responsable de produccion.
- Donde: Vercel Dashboard, configuracion Git del proyecto / ignored build step.
- Por que: el workflow de GitHub Actions deploya backend, corre migraciones y luego deploya frontend. Un deploy Git paralelo de Vercel puede publicar codigo backend antes de que corra el gate de migracion.
- Valor a copiar: ninguno.
- Validar: pushear un cambio inocuo a una branch de prueba o inspeccionar la configuracion del proyecto Vercel antes de mergear a `main`; los deploys productivos deben ser creados por el workflow CLI de GitHub Actions, no por un trigger Git independiente de Vercel.
- Riesgo si se omite: deploys duplicados, race conditions o codigo vivo antes de que el schema Supabase este migrado.

## 14. Revisar Riesgo De Migracion Antes De Mergear Cambios De Schema A `main`

- Que: revisar si el PR contiene migraciones de schema o datos.
- Donde: review del PR y `backend/*/migrations/`.
- Por que: el deploy de GitHub Actions corre `migrate --plan` y `migrate --noinput` automaticamente antes del deploy productivo de Vercel.
- Valor a copiar: ninguno.
- Validar: el paso de migracion del workflow termina exitosamente y luego `https://shineapp-api.vercel.app/api/health/` retorna `database=ok`.
- Riesgo si se omite: migraciones destructivas, renombres, backfills grandes o cambios non-null inseguros pueden romper la demo publica automaticamente.

Migraciones forward-compatible son aceptables para el camino de release demo automatizado. Migraciones destructivas necesitan un plan manual de rollout y no deben mergearse a `main` como deploy demo rutinario.

## 14.1 Aplicar Indices De Performance Sin Lock (CREATE INDEX CONCURRENTLY)

- Que: las migraciones de indices de performance (auditoria 2026-06-12) usan la
  operacion `AddIndexConcurrentlyIfPostgres` (`backend/core/migration_operations.py`)
  con `atomic = False`. En PostgreSQL crean el indice con `CREATE INDEX CONCURRENTLY`
  (no toma lock ACCESS EXCLUSIVE: la tabla sigue aceptando escrituras durante el
  build). En SQLite (tests/dev) caen a un `CREATE INDEX` normal.
- Migraciones afectadas:
  - `core/0025_auditlog_audit_biz_created_idx_and_more` (AuditLog: 4 indices)
  - `inventory/0012_materialpurchase_matpur_biz_purchased_idx_and_more` (StockMovement, MaterialPurchase)
  - `debts/0007_debt_debt_biz_origin_idx_debt_debt_biz_due_idx_and_more` (Debt, DebtPayment)
  - `fixed_expenses/0002_fixedexpense_fixexp_biz_active_idx_and_more`
  - `quotes/0006_quote_quote_biz_qdate_idx_quote_quote_biz_status_idx`
  - `tasks/0003_task_task_biz_status_idx_task_task_biz_assignee_idx`
  - `catalog/0011_sector_sector_biz_active_idx_and_more`
- Donde: el deploy automatizado de GitHub Actions corre `migrate --noinput` (ver
  seccion 14). Con CONCURRENTLY el migrate no bloquea escrituras, asi que es seguro
  por el camino normal.
- Caveat de pooler (IMPORTANTE): `CREATE INDEX CONCURRENTLY` necesita una conexion
  de SESION, no el transaction pooler de Supabase (pgBouncer en modo transaction;
  ver seccion 2, el `DATABASE_URL` usa transaction pooler para Vercel). Si el
  `migrate` de CI corre contra el transaction pooler, estas migraciones pueden
  fallar. Opciones: (a) apuntar el `DATABASE_URL` de migracion al endpoint de
  sesion/directo de Supabase (puerto 5432, no el pooler 6543), o (b) correr estas
  migraciones a mano desde un shell confiable con la conexion directa.
- Recuperacion si se interrumpe: una creacion CONCURRENTLY abortada deja un indice
  INVALID que NO se usa y bloquea reintentos con el mismo nombre. Detectar y limpiar:

  ```sql
  -- indices invalidos
  SELECT c.relname FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
  WHERE NOT i.indisvalid;
  -- dropear el invalido (reemplazar <name>) antes de reintentar el migrate
  DROP INDEX CONCURRENTLY IF EXISTS <name>;
  ```

- Validar: tras el migrate, `https://shineapp-api.vercel.app/api/health/` retorna
  `database=ok`; y en la DB, `\d+ core_auditlog` (o el `pg_index` query de arriba sin
  el filtro `NOT indisvalid`) muestra los indices `audit_biz_*`, `stockmv_biz_*`,
  `debt_biz_*`, etc. como validos.
- Riesgo si se omite el caveat de pooler: el paso de migracion del deploy puede
  fallar y abortar el release, o (peor) si se quitara CONCURRENTLY, un `CREATE INDEX`
  normal lockearia AuditLog/StockMovement durante el build con datos reales.

## 15. Separar Staging Y Produccion Real

- Que: crear proyectos web/API Vercel, proyectos Supabase, buckets Storage, entornos Sentry y entornos GitHub separados para `staging` y `production`.
- Donde: Vercel, Supabase, Sentry y configuracion del repositorio GitHub.
- Por que: el camino actual `shineapp-web`, `shineapp-api` y `demo-production` son recursos demo y no deben contener datos reales de clientes.
- Valor a copiar: sin secretos compartidos; cada entorno recibe su propio `DJANGO_SECRET_KEY`, `DATABASE_URL`, claves S3, Sentry DSN y URL de API frontend generados.
- Validar: `verify-env.ps1 -Production` pasa contra la forma del env productivo, y los dashboards staging/prod muestran project ids, database refs, buckets, dominios y DSNs distintos.
- Riesgo si se omite: datos test/demo, secretos, observabilidad y evidencia de rollback pueden contaminar clientes reales.

## 16. Configurar Sentry Y WAF Antes De Trafico Real

- Que: crear el proyecto backend en Sentry y configurar reglas de rate-limit de Vercel Firewall/WAF.
- Donde: configuracion de proyecto Sentry y Vercel Dashboard, seccion Firewall del proyecto API real.
- Por que: produccion debe capturar excepciones backend y limitar abuso de trafico publico antes del acceso de clientes.
- Valores a setear:
  - `SENTRY_DSN=<backend-sentry-dsn>`
  - `SENTRY_ENVIRONMENT=production`
  - `SENTRY_TRACES_SAMPLE_RATE=0.05` inicialmente
  - `SENTRY_SEND_DEFAULT_PII=0`
  - `WAF_PROVIDER=vercel`
  - `WAF_STATUS=configured` solo despues de activar reglas
- Reglas WAF a configurar:
  - limite mas estricto para `/api/auth/login/`
  - limite mas estricto para `/api/public/landing/*/requests/`
  - limite general o politica challenge para `/api/*`
- Validar: `verify-env.ps1 -Production` rechaza el env hasta que Sentry y WAF esten configurados; Sentry recibe una excepcion de prueba controlada desde un entorno no cliente.
- Riesgo si se omite: errores productivos quedan invisibles y endpoints publicos siguen siendo mas faciles de abusar.

## 17. Rotar Secretos Para El Cutover Productivo

- Que: rotar toda credencial demo/compartida antes de los primeros datos reales de cliente.
- Donde: env vars de proyecto Vercel, Supabase Dashboard, entornos GitHub, Sentry y cualquier proveedor de email.
- Valores a rotar:
  - `DJANGO_SECRET_KEY`
  - password de base Supabase o credencial pooler si se compartio durante setup
  - `SUPABASE_S3_ACCESS_KEY_ID` y `SUPABASE_S3_SECRET_ACCESS_KEY`
  - passwords de app demo y cualquier password de Django admin
  - `DJANGO_MIGRATION_SECRET_KEY`
  - `VERCEL_TOKEN` si tenia scope amplio o se compartio
- Validar: redeploy/restart del runtime aprobado solo despues de rotar, luego healthcheck, login, smoke autenticado y smoke de media.
- Riesgo si se omite: credenciales de etapa demo se convierten en credenciales productivas de larga vida.

## 18. Configurar VAPID Keys Para Push Notifications

- Que: generar un par VAPID y cargarlo en los dos proyectos Vercel para habilitar push notifications del navegador.
- Donde: shell local confiable para generar; Vercel Dashboard de `shineapp-api` y `shineapp-web` para cargar.
- Por que: sin estas keys, el backend devuelve False silenciosamente en `notifications/service.py` (no envia ningun push) y el frontend ni siquiera registra el service worker, por lo que ningun `UserProfile` guarda su `push_subscription`. Resultado: los avisos al negocio cuando llega una solicitud desde la turnera publica nunca llegan.
- Valor a generar:

  ```powershell
  npx web-push generate-vapid-keys --json
  ```

  Devuelve `{"publicKey": "...", "privateKey": "..."}`. Guardar fuera del repo.
- Valor a setear en `shineapp-api` (backend):
  - `VAPID_PRIVATE_KEY=<privateKey>` (secreto)
  - `VAPID_PUBLIC_KEY=<publicKey>`
  - `VAPID_CLAIMS_EMAIL=mailto:<contacto-soporte>`
- Valor a setear en `shineapp-web` (frontend):
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>` (debe ser exactamente igual a `VAPID_PUBLIC_KEY` del backend)
- Validar:
  - Login al dashboard con un usuario empleador y aceptar el prompt de notificaciones del navegador.
  - `GET /api/auth/me/` no es necesario; el frontend dispara `PATCH /api/auth/me/` con la suscripcion en `useEffect` al cargar el dashboard.
  - En la DB demo: `SELECT COUNT(*) FROM core_userprofile WHERE push_subscription IS NOT NULL;` debe pasar de 0 a >=1.
  - Desde otro dispositivo o ventana incognito, abrir la turnera publica (`/publica/<slug>`) y enviar una solicitud de prueba; el navegador del dashboard debe mostrar una notificacion del sistema.
- Riesgo si se omite: las notificaciones push de nueva solicitud y de confirmacion de turno no funcionan; el email sigue llegando pero la push promesa al cliente y al negocio queda muda.
- Rotacion: rotar las VAPID keys invalida todas las suscripciones existentes en navegadores. Los usuarios deben volver a aceptar el prompt de notificaciones para que el dashboard guarde una nueva suscripcion. Comunicar antes de rotar.

## 19. Gate De Rollback, Migracion Y Smoke De Media

- Que: antes de cada release productiva, documentar owner de rollback, ultimo deployment bueno conocido, backup/restore point de base de datos y riesgo de migracion.
- Donde: checklist de release o descripcion de PR antes de mergear al camino de deploy productivo.
- Checks requeridos:
  - revisar `python manage.py migrate --plan`
  - confirmar que las migraciones sean forward-compatible, o escribir un plan manual de rollout/rollback
  - confirmar que ningun comando seed/demo corre contra produccion
  - registrar la URL previa de deployment Vercel o tag de imagen de contenedor
  - correr `scripts/deploy/smoke-test.ps1` con URLs web/API
  - si existe una URL de media test, incluir `-MediaUrl <signed-or-public-media-url>`
  - subir manualmente un logo/avatar/documento, recargar y confirmar que el PDF de cotizacion generado renderiza el logo
- Validar: release notes contienen la decision de migracion/rollback y evidencia smoke antes de apuntar trafico de clientes al deployment.
- Riesgo si se omite: cambios de schema y regresiones de media pueden descubrirse solo despues de uso de clientes.
