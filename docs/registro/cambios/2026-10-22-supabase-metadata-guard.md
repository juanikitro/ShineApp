# Control reproducible de metadatos Supabase

## Que cambia

El comando `check_supabase_security` verifica el contrato interno de `public`
sin leer filas ni cambiar permisos: RLS, grants efectivos y defaults, incluidas
views, funciones, `PUBLIC`, herencia y columnas. Un hallazgo falla explicitamente;
la opcion `--include-sql-plan` genera SQL citado para revision humana, nunca lo aplica.

## Contrato y limites

Fuente operativa: `docs/deployment/supabase.md`. El workflow Validate prueba
regresiones con PostgreSQL sintetico sin credenciales Supabase. Las tablas nuevas
requieren RLS por separado de defaults; no se agregan triggers ni cambios SQL
automaticos a deploy. Media demo/prod permanece privada con URLs firmadas.

Se revalidaron advisors/metadatos remotos con autorizacion acotada del coordinador:
55 tablas con RLS y sin grants efectivos sobre objetos, pero persisten USAGE de
schema heredado y EXECUTE global para futuras funciones. SQL exacto no aplicado
y limites en la fuente operativa. CI sintetico se alinea a PostgreSQL 17 del
destino e incluye el privilegio MAINTAIN; PostgreSQL 15 ya tuvo evidencia previa.
No hubo deploy, rotacion ni cierre de #279/#289. Dashboard/API, acceso Storage,
pruebas Django de dos negocios, logs y revocacion Meta siguen pendientes humanos;
#304 continua postergado.

## Validacion

Tests focalizados: `backend/tests/test_supabase_security.py` y
`backend/tests/test_supabase_security_postgres.py`. Los segundos requieren un
cluster sintetico expresamente habilitado, y no se reemplazan por SQLite/mocks.
