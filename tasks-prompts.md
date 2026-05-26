# Prompts de ejecución por tarea — ShineApp

Cada bloque es un prompt autónomo para un agente nuevo. El agente no tiene contexto de conversaciones previas. Copiar el bloque completo.

El estado de cada tarea vive en `tasks.json` en la raíz del repo. Al terminar una tarea, actualizar `"status"` a `"completed"` (o `"blocked"` con una nota si aplica).

---

## TAREA 1.1 — Configurar secretos de GitHub Actions

> ⚠️ MANUAL — requiere acceso a GitHub y Vercel Dashboard. El agente puede guiar los pasos pero no puede ejecutarlos directamente.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md y docs/deployment/github-actions.md antes de actuar.
- El workflow .github/workflows/deploy-vercel-demo.yml deploya a Vercel después de mergear a main.
- Actualmente falla porque faltan secretos en GitHub.

TAREA:
Guiame paso a paso para configurar los secretos necesarios en GitHub. Debes:
1. Leer docs/deployment/github-actions.md y docs/deployment/manual-steps.md §11 para entender exactamente qué secretos se necesitan.
2. Explicarme dónde conseguir cada valor (Vercel Dashboard, Supabase, etc.).
3. Darme las instrucciones exactas para cargarlos en GitHub (Settings > Secrets and variables > Actions).
4. Indicar cuáles van como Repository secrets y cuáles como Environment secrets del entorno demo-production.

Al terminar, actualiza "status": "completed" en la tarea 1.1 de tasks.json.

NO hagas commits ni cambios de código. Esta tarea es solo configuración de infraestructura.
```

---

## TAREA 1.2 — Proteger rama main en GitHub

> ⚠️ MANUAL — requiere acceso a GitHub Settings.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md y docs/deployment/manual-steps.md §12 antes de actuar.
- El CI usa el check Validate / ci-required (definido en .github/workflows/validate.yml).
- main es la rama de publicación; development es donde se trabaja.

TAREA:
Guiame paso a paso para configurar branch protection sobre main en GitHub. Debes:
1. Leer docs/deployment/manual-steps.md §12 para ver los valores exactos a configurar.
2. Explicarme si usar Branch Protection Rules o Rulesets (preferir lo que sea más estable para el plan actual del repo).
3. Darme las instrucciones exactas para cada opción a activar: PR requerido, status check requerido, bloquear force push, no bypass.
4. Confirmar cómo validar que quedó bien configurado.

Al terminar, actualiza "status": "completed" en la tarea 1.2 de tasks.json.

NO hagas commits ni cambios de código.
```

---

## TAREA 1.3 — Deshabilitar deploys Git automáticos de Vercel

> ⚠️ MANUAL — requiere acceso a Vercel Dashboard.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md y docs/deployment/manual-steps.md §13 antes de actuar.
- Hay dos proyectos Vercel: shineapp-api (prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC) y shineapp-web (prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ).
- GitHub Actions (deploy-vercel-demo.yml) corre migraciones Django ANTES de deployar a Vercel.
- Si Vercel tiene deploy Git automático activo, puede publicar código nuevo antes de que las migraciones corran → race condition.

TAREA:
Guiame para deshabilitar los deploys Git integrados de Vercel en ambos proyectos. Debes:
1. Leer docs/deployment/manual-steps.md §13 y docs/deployment/github-actions.md para entender el riesgo exacto.
2. Explicarme la opción correcta en Vercel Dashboard (ignorar build step vs deshabilitar Git integration).
3. Darme los pasos exactos para cada proyecto.
4. Indicar cómo validar que el cambio quedó activo.

Al terminar, actualiza "status": "completed" en la tarea 1.3 de tasks.json.

NO hagas commits ni cambios de código.
```

---

## TAREA 1.4 — Mergear development → main

> ✅ PUEDE EJECUTARSE — requiere que 1.1, 1.2 y 1.3 estén completadas.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md antes de actuar.
- Rama activa: development. Rama de publicación: main.
- development tiene ~40 commits adelante de main (refactors UI, trial signup, multi-negocio, MkDocs).
- Las tareas 1.1 (secretos GitHub Actions), 1.2 (branch protection main) y 1.3 (deshabilitar deploys Git Vercel) deben estar completadas antes de ejecutar esta tarea. Verificá su estado en tasks.json.
- CI: .github/workflows/validate.yml. Deploy: .github/workflows/deploy-vercel-demo.yml.

TAREA:
1. Verificá en tasks.json que las tareas 1.1, 1.2 y 1.3 tienen status "completed". Si alguna está pendiente, detené y reportá el bloqueo.
2. Revisá el estado del repo: git status, git log main..HEAD.
3. Abrí (o simulá la apertura de) un PR de development → main y confirmá que CI corre en verde.
4. Una vez que Validate / ci-required pase, mergeá a main.
5. Monitoreá que el workflow deploy-vercel-demo.yml corra exitosamente: migraciones y deploy de ambos proyectos Vercel.
6. Verificá el healthcheck: GET https://shineapp-api.vercel.app/api/health/ debe retornar status=ok y database=ok.
7. Documentá el resultado en docs/deployment/demo-readiness.md (deployment IDs del deploy nuevo, fecha).

Al terminar, actualiza "status": "completed" en la tarea 1.4 de tasks.json.
```

---

## TAREA 2.1 — Eliminar proyecto Vercel accidental 'backend'

> ⚠️ MANUAL — requiere acceso a Vercel Dashboard.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee docs/deployment/demo-readiness.md antes de actuar.
- Durante el primer deploy CLI se creó un proyecto Vercel llamado "backend" (distinto de shineapp-api).
- Los proyectos legítimos son: shineapp-api (prj_WwudUOmi4PBhPMpyeSgGaHlOB7pC) y shineapp-web (prj_D7voyLTWsQ6QsD7zik1rWNGnbZZJ) bajo el team juanikitros-projects (team_SU2ZYRqjIjG8JhFn2pc1NVxi).

TAREA:
1. Guiame para identificar el proyecto "backend" accidental en Vercel Dashboard.
2. Confirmar que no está en uso ni tiene env vars de producción importantes.
3. Eliminar el proyecto desde Vercel Dashboard.
4. Validar que la lista de proyectos del team muestra solo shineapp-api y shineapp-web.

Al terminar, actualiza "status": "completed" en la tarea 2.1 de tasks.json.

NO hagas commits ni cambios de código.
```

---

## TAREA 2.2 — Validar flujo de media privada end-to-end

> ⚠️ MANUAL — requiere acceso al browser y a la app deployada. Depende de tarea 1.4.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee docs/deployment/manual-steps.md §9 y docs/deployment/demo-readiness.md §Storage antes de actuar.
- URL frontend: https://shineapp-web.vercel.app
- El bucket privado shineapp-media en Supabase Storage usa URLs S3 firmadas (no URLs públicas de objeto).
- La tarea 1.4 (merge a main) debe estar completada. Verificá en tasks.json.

TAREA:
Guiame para validar el flujo de media privada. Los pasos son:
1. Login en https://shineapp-web.vercel.app con credenciales demo.
2. Ir a Configuración > Negocio y subir un logo de prueba.
3. Recargar la página y confirmar que el logo sigue visible (prueba de URLs S3 firmadas).
4. Crear o editar una cotización y descargar el PDF.
5. Confirmar que el PDF renderiza el logo del negocio.
6. Documentar el resultado (ok o bloqueado) en docs/deployment/demo-readiness.md.

Al terminar, actualiza "status": "completed" o "blocked" en la tarea 2.2 de tasks.json.
```

---

## TAREA 2.3 — Rotar secretos demo

> ⚠️ MANUAL — requiere acceso a Vercel Dashboard y Supabase Dashboard.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee docs/deployment/manual-steps.md §10, §17 y docs/deployment/env-vars.md antes de actuar.
- Los secretos actuales (DJANGO_SECRET_KEY, SUPABASE_S3_ACCESS_KEY_ID, SUPABASE_S3_SECRET_ACCESS_KEY) se generaron durante el setup inicial y no deben usarse en demos comerciales.
- La tarea 1.4 (merge a main) debe estar completada. Verificá en tasks.json.

TAREA:
Guiame paso a paso para rotar los secretos demo. Debes:
1. Listar exactamente qué secretos rotar y dónde se configura cada uno (Vercel Dashboard proyecto shineapp-api, Supabase Dashboard, Django shell).
2. Explicar cómo generar valores seguros para cada uno.
3. Indicar el orden correcto de rotación para no romper el deploy activo.
4. Guiarme para hacer redeploy de shineapp-api después de actualizar env vars.
5. Validar: healthcheck ok + login funciona con credenciales nuevas.

NO escribas, pegues ni committees secretos reales. Los valores van solo en los dashboards de Vercel/Supabase.
Al terminar, actualiza "status": "completed" en la tarea 2.3 de tasks.json.
```

---

## TAREA 2.4 — Correr smoke test end-to-end post-deploy

> ✅ PUEDE EJECUTARSE — depende de 1.4 y 2.3.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md, docs/deployment/demo-readiness.md §Smoke y scripts/deploy/smoke-test.ps1 antes de actuar.
- Las tareas 1.4 y 2.3 deben estar completadas. Verificá en tasks.json.
- URLs: frontend https://shineapp-web.vercel.app, API https://shineapp-api.vercel.app/api.

TAREA:
1. Corrí scripts/deploy/smoke-test.ps1 con las URLs de demo y reportá el resultado.
2. Ejecutá el smoke end-to-end manual documentado en demo-readiness.md §Smoke End-To-End:
   a. Crear un negocio trial nuevo con datos descartables.
   b. Confirmar login automático post-signup.
   c. Verificar contexto tenant via GET /api/auth/me/ (negocio, rol empleador, can_view_economy=true, subscription_type=trial).
   d. Crear un empleado desde settings.
   e. Login como empleado y confirmar que economía está oculta en UI.
   f. Verificar 403 en GET /api/cash/daily/ con token de empleado.
3. Documentá el resultado en docs/deployment/demo-readiness.md con fecha y deployment IDs.
4. Hacé commit de los cambios en demo-readiness.md y pusheá a development.

Al terminar, actualiza "status": "completed" o "blocked" en la tarea 2.4 de tasks.json.
```

---

## TAREA 3.1 — Extraer formularios/detail renders residuales de page.tsx

> ✅ PUEDE EJECUTARSE — tarea de refactor de código.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md, docs/ia/UI_CONTEXT.md y docs/ui-ux/UI_UX_ISSUES.md §UI-009 antes de actuar.
- frontend/app/page.tsx tiene 14.436 líneas y ~138 render* después del batch UI-009.
- Los 9 paneles principales ya fueron extraídos: CashPanel, DebtPanel, DashboardPanel, BusinessSettingsPanel, SettingsWorkspace, InventoryPanel, ToolsPanel, QuotesPanel, ServicesPanel.
- Lo que queda pendiente: formularios de alta/edición y vistas de detalle (clientes detail, reservas detail, trabajos detail, etc.) que siguen como bloques JSX dentro de page.tsx.
- Patrón a seguir: el componente extraído recibe props explícitas; page.tsx conserva estado, callbacks, endpoints, payloads y lógica de negocio.

TAREA:
1. Identificá los bloques render* que quedan en page.tsx (formularios y detail renders) sin incluir en ninguno de los 9 paneles ya extraídos.
2. Priorizá los 2-3 más grandes por líneas.
3. Extraé cada uno al patrón de componentes en frontend/app/components/<vertical>/<NombrePanel>.tsx.
4. Validá con: cd frontend && npm run build (sin otros procesos Node activos).
5. Smoke QA de las secciones extraídas.
6. Hacé commits chicos por cada extracción y pusheá a development.

RESTRICCIÓN CRÍTICA: No corras comandos Node en paralelo. Antes de correr npm run build verificá con:
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object { $_.CommandLine -like '*ShineApp*frontend*' }

Al terminar, actualiza "status": "completed" en la tarea 3.1 de tasks.json.
```

---

## TAREA 3.2 — Mover helpers/cálculos de dominio de page.tsx a frontend/lib/

> ✅ PUEDE EJECUTARSE — depende conceptualmente de 3.1 pero puede hacerse en paralelo.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md, docs/ia/TESTING.md §Política de coverage y docs/ia/UI_CONTEXT.md antes de actuar.
- frontend/app/page.tsx está excluido del gate de coverage (90%) por su tamaño monolítico.
- Hay helpers de dominio (formateo, cálculos de totales, filtros de listas, parsing de respuestas API) embebidos en page.tsx que deberían vivir en frontend/lib/ para ser testeables.
- Tests existentes: frontend/lib/*.test.mjs. Patrón: funciones puras exportadas con tests unitarios.

TAREA:
1. Identificá al menos 3-5 helpers/funciones puras en page.tsx que puedan extraerse sin cambiar comportamiento.
2. Extraelos a frontend/lib/ con el naming apropiado (ej. formatters.ts, reservation-helpers.ts).
3. Escribí tests en frontend/lib/*.test.mjs para cada helper extraído.
4. Reemplazá los usos en page.tsx con imports de los nuevos helpers.
5. Validá con: npm run test (sin otros Node activos) y npm run build.
6. Hacé commits por unidad lógica y pusheá a development.

RESTRICCIÓN CRÍTICA: No corras comandos Node en paralelo. Verificá procesos activos antes de cada comando.

Al terminar, actualiza "status": "completed" en la tarea 3.2 de tasks.json.
```

---

## TAREA 4.1 — Verificar coverage backend ≥ 90%

> ✅ PUEDE EJECUTARSE — verificación de calidad.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md y docs/ia/TESTING.md antes de actuar.
- Gate de coverage: backend >= 90% (configurado en backend/.coveragerc).
- Comando principal: powershell -ExecutionPolicy Bypass -File .\scripts\test-coverage.ps1
- Python: usar backend/.venv/Scripts/python.exe; fallback py -3.

TAREA:
1. Verificá que no hay procesos Node de ShineApp/frontend activos antes de correr nada.
2. Corré el coverage de backend: cd backend && .\.venv\Scripts\python.exe -m pytest --cov
3. Reportá el porcentaje de coverage por app y el resultado global.
4. Si el coverage bajó del 90%, identificá qué módulos lo bajaron y agreguemos tests hasta volver al gate.
5. Documentá el resultado (porcentaje exacto y comando ejecutado).

Al terminar, actualiza "status": "completed" o "blocked" en la tarea 4.1 de tasks.json, con nota del porcentaje obtenido.
```

---

## TAREA 4.2 — Verificar coverage frontend ≥ 90%

> ✅ PUEDE EJECUTARSE — verificación de calidad.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md y docs/ia/TESTING.md §Restricción de recursos frontend antes de actuar.
- Gate de coverage: frontend >= 90% en statements, branches, functions y lines (configurado en frontend/vitest.config.mjs).
- Tests: frontend/lib/*.test.mjs y frontend/app/components/**/*.test.{ts,tsx}.
- RESTRICCIÓN: No correr comandos Node en paralelo.

TAREA:
1. Verificá que no hay procesos Node de ShineApp/frontend activos:
   Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object { $_.CommandLine -like '*ShineApp*frontend*' }
2. Corré: cd frontend && npx vitest run --maxWorkers=1 --coverage
3. Reportá el porcentaje por métrica (statements/branches/functions/lines) y qué archivos tienen menos del 90%.
4. Si alguna métrica bajó del 90%, identificá la causa (probablemente paneles extraídos en UI-009 sin tests).
5. Documentá el resultado.

Al terminar, actualiza "status": "completed" o "blocked" en la tarea 4.2 de tasks.json, con nota de las métricas obtenidas.
```

---

## TAREA 4.3 — Agregar tests de componente para paneles extraídos en UI-009

> ✅ PUEDE EJECUTARSE — depende del resultado de 4.2.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md, docs/ia/TESTING.md §Matriz mínima de riesgo y docs/ui-ux/UI_UX_ISSUES.md §UI-009 antes de actuar.
- Los 9 paneles extraídos en UI-009 no tienen tests de componente propios:
  CashPanel (frontend/app/components/cash/CashPanel.tsx)
  DebtPanel (frontend/app/components/debts/DebtPanel.tsx)
  DashboardPanel (frontend/app/components/dashboard/DashboardPanel.tsx)
  BusinessSettingsPanel (frontend/app/components/settings/BusinessSettingsPanel.tsx)
  SettingsWorkspace (frontend/app/components/settings/SettingsWorkspace.tsx)
  InventoryPanel (frontend/app/components/inventory/InventoryPanel.tsx)
  ToolsPanel (frontend/app/components/tools/ToolsPanel.tsx)
  QuotesPanel (frontend/app/components/quotes/QuotesPanel.tsx)
  ServicesPanel (frontend/app/components/services/ServicesPanel.tsx)
- Solo ejecutar esta tarea si la 4.2 confirmó que el coverage bajó del 90%.
- Patrón de tests existente: frontend/app/components/**/*.test.{ts,tsx}.
- RESTRICCIÓN: No correr comandos Node en paralelo.

TAREA:
1. Verificá el estado de la tarea 4.2 en tasks.json. Si el coverage ya está al 90%, marcá esta tarea como "completed" sin hacer cambios.
2. Para cada panel con cobertura insuficiente, agregar un test mínimo: render sin crash con props vacías/loading/con datos mock.
3. Si el panel tiene acciones críticas (callbacks, handlers), agregar un test de interacción.
4. Reusar patrones de frontend/app/components/ui/*.test.tsx como referencia.
5. Validar: npx vitest run --maxWorkers=1 --coverage pasa al 90%.
6. Hacé commits por panel y pusheá a development.

Al terminar, actualiza "status": "completed" en la tarea 4.3 de tasks.json.
```

---

## TAREA 5.1 — Email de bienvenida post-trial-signup

> ✅ PUEDE EJECUTARSE — feature de Fase 1.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md, docs/plans/2026-05-20-roadmap-saas-shineapp.md §Fase 1 y backend/config/views.py antes de actuar.
- El trial signup ya existe: POST /api/auth/trial-signup/ (TrialSignupView en backend/config/views.py).
- El backend tiene SMTP configurable vía settings (EMAIL_BACKEND, EMAIL_HOST, etc.).
- Patrón de emails en el proyecto: backend/notifications/ o similar (verificar antes de actuar).

TAREA:
1. Revisá cómo está implementado el email en el proyecto (qué apps usan send_mail o similares).
2. Al final de TrialSignupView.post(), después de crear el BusinessAccount y retornar el token, disparar un email de bienvenida al owner_email con: nombre del negocio, URL de acceso (https://shineapp-web.vercel.app), contacto de soporte.
3. El envío de email NO debe bloquear la respuesta del signup si falla (usar try/except o async).
4. Agregar tests backend: happy path con email enviado, y que el signup retorna token aunque el email falle.
5. Validar: cd backend && .\.venv\Scripts\python.exe -m pytest && manage.py check.
6. Hacé commit y pusheá a development.

Al terminar, actualiza "status": "completed" en la tarea 5.1 de tasks.json.
```

---

## TAREA 5.2 — Reset de contraseña por email

> ✅ PUEDE EJECUTARSE — feature de Fase 1.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md, docs/ia/ARCHITECTURE.md, backend/config/urls.py y frontend/lib/page-support.tsx antes de actuar.
- Stack: Django + DRF en backend/, Next.js en frontend/. Auth por TokenAuthentication.
- NO existe actualmente un flujo de reset de contraseña operativo (verificar antes de actuar).

TAREA:
Implementar flujo mínimo de recuperación de contraseña:

BACKEND:
1. POST /api/auth/password-reset/ — recibe {email}, genera token con expiración (ej. 1h), envía link al usuario. Retorna 200 aunque el email no exista (no exponer si el email existe).
2. POST /api/auth/password-reset/confirm/ — recibe {token, new_password}, valida token no vencido/no usado, actualiza contraseña, invalida el token.
3. Tests: token válido resetea contraseña, token vencido rechaza 400, token inválido rechaza 400, email inexistente retorna 200 silencioso.
4. Registrar endpoints en backend/config/urls.py.

FRONTEND:
5. Agregar link "Olvidé mi contraseña" en la pantalla de login (frontend/lib/page-support.tsx o page.tsx según donde vive el form).
6. Formulario mínimo: campo email → POST /api/auth/password-reset/ → mensaje de confirmación.
7. Página/modal de confirmación con campo nueva contraseña que consume el token del link.

VALIDACIÓN:
8. cd backend && .\.venv\Scripts\python.exe -m pytest
9. cd frontend && npm run build (sin otros Node activos)
10. Smoke manual del flujo.
11. Hacé commits separados backend/frontend y pusheá a development.

Al terminar, actualiza "status": "completed" en la tarea 5.2 de tasks.json.
```

---

## TAREA 5.3 — Decidir: alta demo asistida vs link privado

> ⚠️ DECISIÓN DE NEGOCIO — requiere input del dueño del producto.

```
Sos un asistente de producto trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee docs/plans/2026-05-20-roadmap-saas-shineapp.md §Fase 1 §Pregunta de negocio antes de actuar.
- El trial signup ya existe como POST /api/auth/trial-signup/ (endpoint público).
- La pregunta abierta es: el alta trial la opera el equipo interno de ShineApp, o el prospecto accede por su cuenta con un link privado.

TAREA:
No implementes código. Tu objetivo es ayudar a tomar la decisión:
1. Presentame las dos opciones con sus implicaciones técnicas y operativas.
   - Opción A: Alta asistida por equipo interno (el equipo crea el negocio desde Django admin o desde un panel interno).
   - Opción B: Link privado para el prospecto (el trial signup público queda activo, se comparte un link directo a https://shineapp-web.vercel.app con modo trial).
2. Para cada opción, describir: quién ejecuta el alta, qué pasa si el prospecto "se equivoca", cómo escala, riesgo de spam/abuso.
3. Recomendá cuál es más adecuada para el estado actual del producto (MVP en Fase 1).
4. Una vez que el usuario tome la decisión, documentarla en docs/registro/decisiones/2026-05-22-alta-demo-asistida-vs-link.md.

Al terminar, actualiza "status": "completed" en la tarea 5.3 de tasks.json.
```

---

## TAREA 6.1 — Registrar batch UI-009 en docs/registro/cambios/

> ✅ PUEDE EJECUTARSE — documentación.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee AGENTS.md y docs/indice.md §Registro técnico antes de actuar.
- Los commits del 21–22 de mayo extrajeron 9 paneles de page.tsx (UI-009):
  CashPanel, DebtPanel, DashboardPanel, BusinessSettingsPanel, SettingsWorkspace,
  InventoryPanel, ToolsPanel, QuotesPanel, ServicesPanel.
- Ver docs/ui-ux/UI_UX_ISSUES.md §UI-009 para la evidencia completa.
- Convención de registro: docs/registro/cambios/YYYY-MM-DD-titulo-corto.md, estilo compacto, preservar paths y validación ejecutada.

TAREA:
1. Revisá los commits relevantes con git log para confirmar fecha y alcance exacto.
2. Creá docs/registro/cambios/2026-05-22-ui009-extraccion-paneles.md con:
   - Qué se extrajo (lista de componentes con path)
   - Estado final de page.tsx (líneas, render* count)
   - Validación ejecutada (npm run build, QA smoke por sección)
   - Deuda residual explícita (formularios/detail renders que quedan)
3. Hacé commit del archivo y pusheá a development.

Al terminar, actualiza "status": "completed" en la tarea 6.1 de tasks.json.
```

---

## TAREA 6.2 — Actualizar demo-readiness.md post-merge

> ✅ PUEDE EJECUTARSE — depende de 1.4 y 2.4.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee docs/deployment/demo-readiness.md antes de actuar.
- Las tareas 1.4 (merge a main) y 2.4 (smoke post-deploy) deben estar completadas. Verificá en tasks.json.

TAREA:
1. Leé el estado actual de demo-readiness.md.
2. Actualizá los siguientes campos con los valores del deploy más reciente:
   - Fecha de última validación
   - Deployment IDs de shineapp-api y shineapp-web (obtenelos de Vercel o del output del smoke)
   - Estado de secretos rotados (si 2.3 está completada)
   - Resultado del smoke end-to-end (si 2.4 está completada)
3. Hacé commit del archivo y pusheá a development.

Al terminar, actualiza "status": "completed" en la tarea 6.2 de tasks.json.
```

---

## TAREA 6.3 — Regenerar índices de docs

> ✅ PUEDE EJECUTARSE — depende de 6.1 y 6.2.

```
Sos un asistente técnico trabajando en ShineApp, un MVP SaaS para car detailing.

CONTEXTO:
- Repo: C:\Users\Juanito\Desktop\Repos-Codex\ShineApp
- Lee docs/indice.md §Documentación navegable antes de actuar.
- Las tareas 6.1 y 6.2 deben estar completadas (nuevos archivos en docs/registro/cambios/). Verificá en tasks.json.
- Comando para regenerar índices: py -3 scripts/check_docs.py --write --skip-build
- Comando para validar build de docs: py -3 -m mkdocs build --strict

TAREA:
1. Verificá que 6.1 y 6.2 están completadas en tasks.json.
2. Corré: py -3 scripts/check_docs.py --write --skip-build
3. Revisá qué índices se actualizaron (docs/registro/cambios/index.md, docs/registro/decisiones/index.md).
4. Corré: py -3 -m mkdocs build --strict y confirmá que no hay links rotos.
5. Hacé commit de los índices actualizados y pusheá a development.

Al terminar, actualiza "status": "completed" en la tarea 6.3 de tasks.json.
```

---

## Uso del archivo tasks.json

Para marcar una tarea como completada, editar `tasks.json` y cambiar el campo `"status"`:

```json
"status": "completed"
```

Valores válidos: `"pending"` | `"in_progress"` | `"completed"` | `"blocked"`

Para tareas bloqueadas agregar un campo `"block_reason"` con la causa.
