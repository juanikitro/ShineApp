# WhatsApp: onboarding por modo y provider sin falsa verificacion

Fecha: 2026-10-22

## Cambio

- Configuracion distingue Gratis wa.me, fake, Meta y Twilio con requisitos y campos propios.
- Muestra estado guardado y pendientes accionables del borrador sin llamar al provider.
- Sustituye la etiqueta Produccion Meta por API Meta y explicita que guardar, tener
  historial o completar requisitos locales no verifica credenciales, templates ni entrega.
- Conserva secretos write-only, omite credenciales al guardar free/fake y evita reutilizar
  secretos al cambiar entre providers reales. No elimina ni rota credenciales guardadas.
- Valida mensajes gratis y consistencia de reglas; conserva schemas pagos existentes.
- El bootstrap demo selecciona explicitamente API + fake, sin activar providers reales.

## Contrato y alcance

- Issue #283. Fuente operativa: `docs/deployment/whatsapp.md`.
- Sin endpoints, cambios de permisos, migraciones, dependencias nuevas ni cambios de tenant.
- EmployerOnly y scoping siguen en backend. Sin acceso a datos o credenciales reales.
- Fuera de alcance: activacion paga/entrada de mensajes (#282), rotaciones (#289),
  restore y operaciones de produccion (#304).

## Validacion

- `npx vitest run lib/whatsapp-onboarding.test.mjs app/components/settings/settings.test.tsx --maxWorkers=1 --coverage --coverage.include=lib/whatsapp-onboarding.ts`: 26 tests verdes; helper 100% lineas, 92.14% ramas.
- `npx eslint lib/whatsapp-onboarding.ts app/components/settings/SettingsWorkspace.tsx app/components/settings/settings.test.tsx`: 0 errores; 13 warnings del panel existente (any, max-lines, import previo sin usar).
- Instalacion aislada con `npm ci --ignore-scripts` y lockfile existente; sin upgrades.
- Smoke backend con entorno limpio (sin cargar `.env`), SQLite en memoria e interprete
  existente: `python -m pytest tests/test_whatsapp.py::test_whatsapp_config_is_employer_only tests/test_whatsapp.py::test_manual_whatsapp_message_sends_with_fake_provider tests/test_whatsapp.py::test_free_log_rejects_foreign_business_customer`: 3 verdes, 6 deprecation warnings de dependencias.
- El test de configuracion comprueba 403 para empleado y token write-only; el smoke manual
  registra envio fake y el test de tenant rechaza un cliente de otro negocio. Son tests API
  sinteticos, no un recorrido de navegador ni interoperabilidad con providers reales.
- Primer intento de smoke incluyo un selector inexistente `test_whatsapp_config_hides_access_token`;
  no ejecuto tests. Se corrigio usando el test existente que ya cubre esa propiedad.
- No build, suite global, servidor, provider real ni smoke visual responsive. La aceptacion
  visual/teclado en navegador y verificacion operativa externa siguen pendientes.

## Riesgos y mitigacion

- Meta global configurado puede quedar pendiente en UI porque la API no permite verificarlo;
  la ayuda pide comprobacion administrativa sin exponer secretos.
- El historial puede pertenecer a una configuracion anterior del mismo provider; se describe
  como registro historico y nunca como verificacion actual. Free tampoco prueba envio efectivo.
- El bootstrap actualiza configuracion/reglas en llamadas separadas; un fallo parcial requiere
  revisar los pendientes y reintentar. No se afirma atomicidad ni se cambia este contrato.
- Revertir el commit restaura la UI/helper anterior; no hay migracion ni datos que revertir.

## Skills

- `orchestration`: ownership, mensajes al coordinador y turno exclusivo de Node.
- `brainstorming`: comparar un wizard nuevo con extender el panel/helper actual; se eligio
  el cambio local por la autorizacion explicita de ejecucion autonoma y contratos existentes.
- `vercel-react-best-practices`: mantener estado derivado local y helper testeable sin nuevo fetch.
- `systematic-debugging`: evidencia del bootstrap que conservaba modo free y correccion focal.
- Sin diseno de sistemas nuevo, Supabase ni cambio visual estructural: no se requirio grill,
  skill de Supabase o una nueva direccion de diseno.
