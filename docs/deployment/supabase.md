# Configuracion De Supabase

## Postgres

1. Crear un proyecto Supabase para la demo.
2. En Project Settings o Connect, copiar una connection string de Postgres.
3. Para Vercel serverless, preferir la URL del pooler. Usar transaction pooler para cargas cortas request/response salvo que necesites funcionalidades de sesion.
4. Guardarla en el proyecto API como `DATABASE_URL`.
5. Setear `DATABASE_SSL_REQUIRE=1`.
6. Connection pooling: `settings_production.py` ahora usa `conn_max_age=300` y `conn_health_checks=True` por default. Ambos son configurables via `DATABASE_CONN_MAX_AGE` y `DATABASE_CONN_HEALTH_CHECKS`. Con esto Django reusa la conexion entre requests dentro del mismo contenedor de Vercel (~50-200ms menos por request). Si Vercel apaga el contenedor por inactividad, simplemente abre una nueva conexion en la primera request.
7. Para cargas mayores (alta concurrencia o multiples contenedores serverless en paralelo) considerar el transaction pooler de Supabase en puerto 6543: cambiar `DATABASE_URL` a la URL del pooler en transaction mode. NO requiere cambio de codigo; el pooler maneja la concurrencia. Trade-off: el transaction pooler no soporta prepared statements ni session-level features (LISTEN/NOTIFY). Django funciona OK en transaction mode.

Proyecto demo actual:

- Nombre: `<SUPABASE_PROJECT_NAME>`
- Project ref: `<SUPABASE_PROJECT_REF>`
- Region: `sa-east-1`
- API URL: `https://<SUPABASE_PROJECT_REF>.supabase.co`
- DB host: `db.<SUPABASE_PROJECT_REF>.supabase.co`

El MCP no expone el password de base de datos ni la URL pooler completa. Para la demo publica, `DATABASE_URL` se copio manualmente desde la pantalla Connect del Supabase Dashboard y se guardo en el proyecto Vercel API mas el entorno GitHub `demo-production` para migraciones automatizadas.

Validar localmente con import de configuracion de produccion antes de desplegar:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_production"
.\.venv\Scripts\python.exe manage.py check --deploy
```

## Storage

1. Crear un bucket, por ejemplo `<SUPABASE_STORAGE_BUCKET>`.
2. Mantener el bucket de media **privado**, con URLs firmadas. Logos y
   documentos comparten Storage: una demo no justifica hacer publico el bucket.
   Un catalogo publico futuro requiere una superficie separada y revision propia.
3. Habilitar acceso S3 para Storage.
4. Crear access key y secret para uso server-side solamente.
5. Configurar:
   - `SUPABASE_STORAGE_ENABLED=1`
   - `SUPABASE_STORAGE_BUCKET=<SUPABASE_STORAGE_BUCKET>`
   - `SUPABASE_S3_ENDPOINT_URL=https://<project-ref>.storage.supabase.co/storage/v1/s3`
   - `SUPABASE_S3_REGION_NAME=<region>`
   - `SUPABASE_S3_ACCESS_KEY_ID=<key-id>`
   - `SUPABASE_S3_SECRET_ACCESS_KEY=<secret>`

No exponer access keys S3 en Next.js.

Storage demo actual:

- Bucket: `<SUPABASE_STORAGE_BUCKET>`
- Acceso: privado
- Setting backend recomendado: `SUPABASE_STORAGE_QUERYSTRING_AUTH=1`
- Endpoint: `https://<SUPABASE_PROJECT_REF>.storage.supabase.co/storage/v1/s3`
- Base URL publica: dejar sin setear mientras el bucket sea privado.
- Validacion el 2026-05-18: Django `migrate --check` contra el transaction pooler termino limpio.
- Validacion el 2026-05-18: S3 `head_bucket` retorno OK para `<SUPABASE_STORAGE_BUCKET>`.
- Validacion el 2026-05-18: healthcheck publico de API retorno `database=ok`.

Las access keys S3 no son expuestas por el MCP. Crearlas manualmente en Supabase Dashboard y guardarlas solo en env vars del backend en Vercel.

Comando de migracion una vez disponible `DATABASE_URL`:

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings_migrations"
$env:DJANGO_MIGRATION_SECRET_KEY="<dedicated-migration-secret>"
$env:DATABASE_URL="<supabase-pooler-url>"
$env:DATABASE_SSL_REQUIRE="1"
.\.venv\Scripts\python.exe manage.py migrate
```

No ejecutar `seed_demo` hasta confirmar la base de datos destino.

Estado de seed: el seed demo se aplico a Supabase el 2026-05-18 con flags de confirmacion explicitos para un destino demo. La corrida no creo un superadmin de Django admin.

## Data API y RLS

ShineApp usa Postgres mediante `DATABASE_URL` desde Django; no usa la Data API
de Supabase ni `supabase-js` como acceso de aplicacion. Por eso, las tablas
internas de Django en `public` no son una superficie API valida.

Desde el incidente #279 (2026-08-21), el contrato del proyecto demo es:

- `anon` y `authenticated` no tienen permisos sobre el schema, tablas,
  secuencias ni funciones de `public`.
- Todas las tablas de `public` tienen RLS habilitado y no existen policies
  publicas para esos roles.
- Los privilegios por defecto de tablas, secuencias y funciones creadas por
  Django en `public` tambien quedan revocados para esos roles.
- Un endpoint Data API nuevo debe vivir en un schema dedicado, con grants y
  policies RLS minimos y explicitamente revisados; no reabrir `public` como
  atajo.

En la contencion de agosto se verifico que Django conectaba con `postgres` y
`BYPASSRLS`. Es evidencia historica, no una afirmacion del estado actual.
RLS no reemplaza el scoping por negocio ni los permisos Django. Antes de cambiar grants, RLS o schemas
expuestos, validar al menos:

1. `GET /api/health/` devuelve `database=ok`.
2. El frontend responde y un flujo autenticado representativo funciona.
3. Una solicitud Data API con clave publishable contra una tabla interna de
   `public` devuelve 401/403, sin cuerpo de datos.
4. Security Advisor no informa `rls_disabled_in_public`.

## Control de regresiones de metadatos (#279)

`check_supabase_security` no modifica la base ni consulta filas de negocio.
Usa una transaccion `REPEATABLE READ, READ ONLY`, search path `pg_catalog` y
timeout de 30 segundos por sentencia. Requiere PostgreSQL; SQLite falla
explicitamente. Ejecutarlo solo con destino y acceso autorizados, usando el
entorno operativo ya configurado, sin copiar secretos al repositorio:

```powershell
cd backend
python manage.py check_supabase_security --settings=config.settings_migrations --creator-role postgres --include-sql-plan
```

`postgres` es el creador historico: reemplazarlo por el rol efectivo de
migraciones/SQL de cada entorno y repetir `--creator-role` por cada creador.
Se inspeccionan tambien el usuario conectado y los propietarios observados;
el propietario actual no demuestra quien creo el objeto. Registrar fuera del
repo la identidad operativa de cada creador, incluida cualquier consola que
pueda crear objetos. Un creador desconocido o un rol API ausente falla cerrado.

El JSON fechado incluye inventario de relaciones/rutinas y hallazgos de:

- Tablas normales y particionadas sin RLS; tablas foraneas requieren revision
  separada. No usa una lista fija de las 55 tablas historicas.
- Grants efectivos de `anon`/`authenticated` en schema, tablas, columnas,
  secuencias, views/materialized views y rutinas, incluyendo `PUBLIC`, herencia
  y privilegios de propietario. Los grants se detectan aunque hoy falte USAGE
  en el schema: son una regresion latente.
- Policies aplicables a esos roles, tambien via `PUBLIC`/herencia. No intenta
  demostrar la seguridad de expresiones de policies ni inventa `auth.uid()`
  para autenticacion Django.
- Defaults globales y de `public` de tablas, secuencias y funciones por creador,
  incluso `EXECUTE` a `PUBLIC` implicito cuando no existe fila en `pg_default_acl`.
  Un REVOKE limitado al schema no elimina un grant global.

Views y funciones se inventarian por separado (owner, `security_invoker` en
opciones de view, `security_definer` y firma de rutinas). Una view sin grants
no necesita una policy ficticia; una funcion no queda protegida por activar
RLS en tablas. El contrato interno prohibe acceso de esos roles tambien a una
view `security_invoker` o una funcion `security invoker`.

Salida `status=fail` y codigo no cero bloquean una futura publicacion hasta
resolver o revisar explicitamente el hallazgo. Un error de conexion no equivale
a aprobacion: el comando lo redacta y falla. `status=pass` solo acredita los
metadatos inspeccionados, **no** configuracion Data API/GraphQL, otros schemas,
Storage, secretos, TLS, logs, aislamiento Django ni cierre del incidente.

### SQL reproducible y orden operativo

`--include-sql-plan` agrega `sql_review_plan`: SQL concreto con identificadores
citados obtenido de los mismos metadatos; **nunca lo ejecuta**. Incluye grants
de columnas y roles heredados, RLS faltante, policies y defaults globales/schema.
No es una migracion aprobada ni un rollback. Los comentarios `REVIEW` sobre
ownership, roles privilegiados o tablas foraneas necesitan decisiones separadas.
No alcanza con revocar un grant directo si el acceso proviene de un rol padre.

1. Confirmar proyecto, entorno, consumidores y creadores reales. Capturar en
   evidencia restringida ACL/default ACL, memberships, RLS/policies y schemas
   expuestos **antes** de aplicar SQL; no incluir filas, secretos ni cuerpos
   de funciones potencialmente sensibles en GitHub. Conservar expresiones y
   definiciones de policies solo en ese registro restringido para revertirlas.
2. Ejecutar el chequeo antes de migrar y revisar su plan SQL. Revocar de `PUBLIC`
   o de un padre afecta tambien otros consumidores: verificar dependencias,
   extension owners y el acceso directo del rol Django antes de aprobarlo.
   Revisar defaults globales por su impacto fuera de `public`.
3. Con aprobacion humana independiente, aplicar **solo** el SQL revisado en
   una transaccion con `lock_timeout`/`statement_timeout`, validar y confirmar.
   No forzar RLS al propietario, no cambiar el rol Django, no crear event
   triggers, policies genericas ni grants amplios para evitar un fallo.
4. Despues de cada migracion Django, volver a ejecutar el chequeo. Revocar
   defaults **no activa RLS en tablas nuevas**: la migracion o el plan SQL
   revisado debe incluir `ALTER TABLE public.<tabla> ENABLE ROW LEVEL SECURITY`
   para cada tabla nueva. Mantener compatibilidad de tests SQLite al versionar
   futuros cambios SQL. Mientras tanto, los defaults sin grants reducen la
   ventana de exposicion; el fallo bloquea publicar hasta completar RLS.
5. Repetir validaciones Django/Data API/Storage de abajo. Si un cambio corta
   una funcion legitima, revertir unicamente el cambio propio usando el
   snapshot de metadatos y permisos minimos revisados. No reabrir `public`,
   restaurar credenciales expuestas ni convertir un bucket a publico.

El workflow `Validate`, job `backend`, ejecuta estos tests focalizados contra
un servicio PostgreSQL 15 desechable sin secretos Supabase. Se prueba una tabla
nueva que falla por RLS y luego cumple, grants `PUBLIC`/heredados/columnas,
secuencias, views, funciones y defaults globales/schema; el plan se aplica
solamente a fixtures sinteticas bajo rollback. Otra prueba intenta escribir
dentro de la transaccion del comando y verifica que PostgreSQL lo impide.
CI demuestra el detector y su plan sintetico; **no** audita el entorno remoto.
El gate remoto es operativo y manual; no se agrego una conexion a Supabase al
workflow ni al cold start/deploy.

```powershell
# Solo en un PostgreSQL sintetico aislado ya autorizado (nunca demo/prod).
# DATABASE_URL debe apuntar a ese cluster desechable; pytest crea su test DB.
$env:SHINEAPP_SECURITY_POSTGRES_TESTS="1"
python -m pytest tests/test_supabase_security.py tests/test_supabase_security_postgres.py
```

### Evidencia humana pendiente para cerrar el incidente

- Fecha/proyecto/entorno de inventario actual y valor real de schemas expuestos
  en Dashboard Data API; revisar GraphQL y cualquier otro schema por separado.
  La propuesta historica de retirar `public` no prueba que se haya hecho.
- Clave publishable: HEAD sin filas hacia una tabla interna debe ser denegado
  (401/403, o schema deliberadamente no expuesto documentado), y una fixture
  sintetica debe rechazar escrituras. No usar tablas reales para probar writes.
- Health, login y un flujo autenticado, mas aislamiento de dos negocios con
  identidades sinteticas. Health 200 no demuestra aislamiento ni aceptacion UX.
- Bucket privado: ausencia de lectura/listado anonimos y upload/acceso Django
  de logo/documento sintetico con URL firmada. Separar policies Storage del
  acceso S3 server-side; revisar superficies de claves/backend/frontend/logs
  sin publicar valores. No afirmar seguridad del bundle a partir de este CLI.
- #289: revocar en Meta el token potencialmente expuesto y sustituirlo o
  eliminarlo si no se usa. No reactivar el canal pago para probarlo; preservar
  `wa.me`. Registrar solo fecha, superficie y resultado redactado.
- Ventana conocida de exposicion, disponibilidad/retencion real de logs
  Data API/DB/Storage, incertidumbre sobre accesos y decision humana de
  comunicaciones segun datos/jurisdiccion. La ausencia de logs no prueba que
  no hubo acceso. Clasificar otras credenciales por impacto antes de rotar.

No se ejecuto ninguna de esas validaciones remotas en este cambio. Las acciones
de incidente siguen activas; backups, restores, staging y operacion productiva
general de #304 siguen postergados y no son prerrequisito para contener exposicion.

Referencias oficiales revisadas el 2026-10-22:

- [Data API: grants, RLS y defaults](https://supabase.com/docs/guides/api/securing-your-api).
- [Defaults globales y por schema](https://www.postgresql.org/docs/15/sql-alterdefaultprivileges.html).
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
- [Cambio de autoexposicion](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically):
  anunciado para todos los proyectos el 2026-10-30; no asumir aplicado ni que
  cambie RLS/grants existentes. No reemplaza este control.
- [Changelog](https://supabase.com/changelog): tambien revisados los avisos
  PostgreSQL 15.19/17.11 y ciphers TLS de octubre; inventariar version/extensiones
  y clientes del destino antes de una intervencion, sin inferir estado live.
