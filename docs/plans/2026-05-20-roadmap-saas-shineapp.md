# Roadmap SaaS Profesional ShineApp

## Resumen

ShineApp ya tiene MVP operativo, multi-negocio por `BusinessAccount`, roles `empleador/empleado`, scoping backend por negocio y deploy demo en Vercel + Supabase. El roadmap debe convertir esa base en SaaS sin reescribir el producto: primero hacerlo vendible, despues apto para clientes reales, luego pago, y finalmente robusto para produccion.

Cambios publicos previstos:

- Onboarding de negocio fuera de Django admin, manteniendo que el frontend no decide tenant.
- Invitaciones/reset por email para usuarios operativos.
- Billing externo como fuente de verdad, no `subscription_type` editable manualmente.
- Roles simples por `Group` hasta que una decision de negocio exija mas granularidad.
- Separacion formal de demo/staging/produccion, backups, soporte y operacion comercial.

Fuentes externas verificadas para billing:

- [Stripe subscriptions integration](https://docs.stripe.com/billing/subscriptions/design-an-integration)
- [Stripe Checkout](https://docs.stripe.com/payments/checkout/how-checkout-works)
- [Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Stripe go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)

## Fase 1 - Demo vendible

### Alcance

- Alta asistida de negocio fuera de Django admin para crear `BusinessAccount`, `BusinessProfile` y empleador inicial.
- Login, perfil, settings de negocio, landing publica y gestion basica de empleados mostrables en demo.
- Reset manual o semiautomatico de credenciales suficiente para preventa, con email configurado en entorno demo.
- Documentar guion comercial, limites de demo, datos seed y checklist de preparacion antes de mostrar.

### No-alcance

- Signup publico abierto.
- Cobro real, dunning, facturacion automatica o portal de cliente.
- Roles avanzados o permisos por modulo.

### Riesgos

- Crear otro flujo de alta que duplique reglas del admin.
- Mostrar `subscription_type` como si fuera billing real.
- Dependencia de credenciales demo por defecto.

### Criterios de salida

- Se puede crear un negocio demo sin entrar a Django admin.
- El empleador inicial entra a la app, configura negocio e invita/crea empleado.
- Empleado sigue sin ver economia.
- Demo seed y credenciales quedan rotadas o documentadas como temporales.

### Archivos/modulos probables

- `backend/core/models.py`, `backend/core/admin.py`, `backend/core/permissions.py`.
- `backend/config/views.py`, `backend/config/urls.py`.
- `frontend/app/page.tsx`, `frontend/lib/page-support.tsx`, `frontend/app/styles/shell.css`.
- `docs/deployment/demo-readiness.md`, `docs/deployment/manual-steps.md`.

### Validacion

- Tests backend de alta multi-negocio, login y bloqueo de negocio suspendido.
- Tests de permisos `empleador/empleado` sobre endpoints economicos.
- `powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1`.
- Smoke manual: alta negocio, login empleador, crear empleado, login empleado, verificar economia oculta y `403`.

### Pregunta de negocio

- El alta demo debe ser operada por equipo interno de ShineApp o por el prospecto con un link privado?

## Fase 2 - Beta con clientes reales

### Alcance

- Onboarding invitation-only con email real: invitacion a empleador, activacion, set password y reset.
- Separar staging y produccion antes de datos reales.
- Backups contratados o planificados con prueba de restore.
- Soporte beta: canal, tiempos de respuesta, registro de incidentes y flujo de feedback.
- Hardening de auditoria, suspension/reactivacion, expiracion de invitaciones y rotacion de secretos.

### No-alcance

- Autoservicio publico sin aprobacion comercial.
- Billing automatico con Stripe.
- SLA publico o soporte 24/7.

### Riesgos

- Meter clientes reales en la infraestructura demo.
- Emails sin dominio verificado.
- Backups no probados.
- Invitaciones reutilizables o sin expiracion.

### Criterios de salida

- Cliente beta puede ser dado de alta sin admin y sin passwords compartidos por chat.
- Staging y produccion tienen DB, Storage, env vars y dominios separados.
- Restore probado al menos una vez con datos no productivos.
- Soporte tiene owner, canal y plantilla de incidentes.

### Archivos/modulos probables

- `backend/config/settings.py`, `backend/config/settings_production.py`.
- `backend/core/models.py` para invitaciones o tokens.
- `backend/config/views.py` para reset/invitacion.
- `frontend/app/page.tsx` y componentes de login/activacion si se mantienen en la shell actual.
- `.github/workflows/*`, `scripts/deploy/*`, `docs/deployment/*`.

### Validacion

- Tests de invitacion expirada, invitacion usada, reset invalido, reset valido.
- Test de que usuarios staff/superuser no entran por login operativo.
- Smoke staging completo antes de produccion.
- Restore drill documentado con fecha, origen, destino y resultado.

### Pregunta de negocio

- La beta se cobra manualmente desde el dia uno o se ofrece como piloto gratuito con fecha de cierre?

## Fase 3 - SaaS pago

### Alcance

- Integrar Stripe Billing para suscripciones recurrentes.
- Checkout Session en modo suscripcion para alta o conversion a pago.
- Customer Portal para actualizar medio de pago, facturas, upgrades/downgrades y cancelacion.
- Webhooks idempotentes para reflejar estado de suscripcion en ShineApp.
- Reemplazar `subscription_type` manual por estado derivado: trial, active, past_due, canceled/suspended.
- Definir limites de plan solo si aportan a pricing; evitar RBAC complejo.

### No-alcance

- Marketplace o pagos a terceros.
- PaymentIntents manuales para renovaciones.
- Facturacion fiscal local completa si Stripe no cubre el caso elegido.
- Usage-based billing hasta validar necesidad real.

### Riesgos

- Tratar el pago exitoso de Checkout como fuente final sin webhook.
- No manejar eventos duplicados, demorados o fuera de orden.
- Suspender negocios por pago fallido sin periodo de gracia definido.
- Mezclar email de billing con identidad de login.

### Criterios de salida

- Stripe sandbox cubre checkout, webhook, portal, cancelacion y pago fallido.
- Estado local de negocio cambia solo por eventos confiables o acciones internas auditadas.
- El usuario puede administrar billing sin soporte manual.
- Hay checklist de go-live Stripe, live webhooks y rotacion de claves.

### Archivos/modulos probables

- Nuevo modulo `backend/billing/` o equivalente simple dentro de `core` si se mantiene chico.
- `backend/core/models.py` para IDs externos y estado de suscripcion.
- `backend/config/urls.py` para endpoints de checkout/portal/webhook.
- `frontend/app/page.tsx` para acciones de billing en Configuracion/Perfil.
- `docs/deployment/env-vars.md`, `docs/deployment/manual-steps.md`.

### Validacion

- Tests webhook idempotente con mismo event id.
- Tests de cambio de plan, cancelacion, `past_due` y reactivacion.
- Tests de permisos: solo empleador accede a billing.
- Pruebas Stripe sandbox con claves test y webhook signing secret.
- Validacion de secretos: ninguna key real en repo.

### Preguntas de negocio

- Pricing inicial: plan unico flat-rate, tiers por funcionalidades, o precio por sucursal/usuario?
- Moneda e impuestos: ARS local, USD, ambos, o facturacion manual fuera de Stripe?
- Politica de gracia: cuantos dias de `past_due` antes de suspender acceso?

## Fase 4 - Produccion robusta

### Alcance

- Infra lista para clientes pagos: dominios propios, observabilidad, WAF/rate limits, backups con retencion, restore recurrente.
- Decidir si Django sigue en Vercel serverless o pasa a contenedor persistente.
- Runbooks de incidentes, release, rollback, migraciones, soporte y offboarding.
- Retencion de datos, exportacion por cliente y politica de eliminacion/suspension.
- Operacion comercial: CRM simple, pipeline, contratos, onboarding handoff y soporte posventa.

### No-alcance

- Reescritura microservicios.
- Workers largos en Vercel si se confirma que requieren runtime persistente.
- Enterprise compliance avanzada antes de demanda real.

### Riesgos

- Usar Supabase free/demo como durabilidad productiva.
- Migraciones sin rollback o sin compatibilidad con codigo vivo.
- Falta de monitoreo para errores de pagos, login, storage y emails.
- Soporte comercial sin ownership tecnico.

### Criterios de salida

- Staging replica produccion sin datos reales.
- Backups y restore tienen RPO/RTO definidos y probados.
- Deploy productivo tiene gate de migraciones, smoke y rollback.
- Sentry o equivalente captura errores backend/frontend con owners.
- Existe proceso documentado para alta, suspension, baja, exportacion y soporte.

### Archivos/modulos probables

- `docs/deployment/architecture.md`, `upgrade-path.md`, `manual-steps.md`, `github-actions.md`.
- `scripts/deploy/check-backend.ps1`, `check-frontend.ps1`, `smoke-test.ps1`, `verify-env.ps1`.
- `.github/workflows/validate.yml`, `.github/workflows/deploy-vercel-demo.yml` o nuevo workflow productivo.
- `backend/config/settings_production.py` y env vars Vercel/Supabase.

### Validacion

- `docker compose config --quiet`.
- Suite completa `scripts/validate.ps1`.
- Smoke deploy staging y produccion.
- Restore drill trimestral.
- Prueba de rotacion de secretos.
- Prueba de webhook/billing live con monto minimo o modo controlado antes de abrir ventas.

### Preguntas de negocio

- RPO/RTO aceptable para clientes pagos: horas, dia habil o menor?
- Canal de soporte oficial: WhatsApp, email, ticketera o combinacion?
- Quien aprueba deploy productivo y quien queda on-call ante incidente?

## Supuestos

- El roadmap mantiene el stack actual: Django + DRF, Next.js, Supabase y Vercel hasta que una fase justifique mover Django a contenedor persistente.
- La beta sera invitation-only por defecto para reducir riesgo operativo.
- Billing pago usara Stripe Billing + Checkout + Customer Portal salvo decision comercial contraria.
- No se amplia el sistema de roles antes de tener una necesidad concreta; `empleador/empleado` sigue siendo el contrato inicial.
