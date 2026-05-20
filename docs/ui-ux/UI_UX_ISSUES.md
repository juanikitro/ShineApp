# Incidencias UI/UX - ShineApp

Fuente viva de deuda UI/UX. Esta version separa deuda vigente de deuda ya cerrada en codigo para evitar arrastrar P0/P1 historicos por inercia.

## Auditoria vigente - 2026-05-20

- Rama auditada: `development`.
- Runtime estable: `frontend` con `npm run build` + `npm run start -- -H 127.0.0.1 -p 3000`; backend y Postgres desde Docker local.
- Build validado: `cd frontend && npm run build` completo con Next.js 15.5.18.
- Browser QA: Playwright headless porque Codex Browser bloqueo `localhost`/`127.0.0.1` con `net::ERR_BLOCKED_BY_CLIENT`.
- Viewports: desktop `1440x900` y mobile `390x844`.
- Rutas/flujos probados: login, dashboard, agenda, clientes, caja, configuracion, dark mode, landing publica `/publica/default` y deep-links con `?section=...`.
- Screenshots locales fuera del repo: `C:\Users\Juanito\AppData\Local\Temp\shineapp-ui-audit-2026-05-20\*.png`.
- Resultado QA: sin blank screens, sin overlay de framework, sin console errors, sin page errors y sin respuestas 4xx/5xx en los flujos auditados.
- Batch P1 aplicado 2026-05-20: UI-025, UI-021, UI-003, UI-008, UI-012 y UI-016 quedan cerrados en codigo con el corte minimo documentado abajo.
- Corte UI-009 aplicado 2026-05-20: Caja quedo extraida a `frontend/app/components/cash/CashPanel.tsx` sin cambios intencionales de negocio. `frontend/app/page.tsx` bajo a 17.570 lineas y aprox. 164 coincidencias `render*`; `CashPanel.tsx` concentra 675 lineas presentacionales. QA: `npm run build`, `next start`, `/` y `/?section=cash` en desktop `1440x900` y mobile `390x844`, sin console errors. Screenshots fuera del repo: `C:\Users\Juanito\AppData\Local\Temp\shineapp-ui009-cash-qa\*.png`.
- Segundo corte UI-009 aplicado 2026-05-20: Deudas quedo extraida a `frontend/app/components/debts/DebtPanel.tsx` sin cambios intencionales de negocio. `page.tsx` conserva estado, datos, filtros, callbacks, endpoints, payloads, permisos y reglas; `DebtPanel.tsx` recibe props explicitas y concentra 450 lineas presentacionales. Conteo post-corte: `page.tsx` tiene 17.232 lineas y aprox. 161 coincidencias `render*`. Validacion: `npm run build` paso; `next start` sirvio `/` y `/?section=debts` con HTTP 200. QA visual/screenshot quedo bloqueada por Codex Browser `net::ERR_BLOCKED_BY_CLIENT`; no se agrego tooling Playwright al repo.
- Tercer corte UI-009 aplicado 2026-05-20: Dashboard quedo extraido a `frontend/app/components/dashboard/DashboardPanel.tsx` sin cambios intencionales de negocio. `page.tsx` conserva estado, fetch, callbacks, permisos y routing; `DashboardPanel.tsx` concentra render y calculos presentacionales del tablero. Conteo post-corte: `page.tsx` tiene 16.929 lineas y aprox. 161 coincidencias `render*`; `DashboardPanel.tsx` concentra 906 lineas. Validacion: `npm run build` paso limpio; build adicional con `NEXT_PUBLIC_API_URL=http://localhost:8000/api` tambien paso para QA local. Runtime QA normal autenticada quedo bloqueada por CORS del backend local: `OPTIONS http://localhost:8000/api/auth/me/` desde `http://localhost:9000` respondio 200 sin `Access-Control-Allow-Origin`. Como workaround solo visual, Chrome headless con `--disable-web-security` cargo `/?section=dashboard` en desktop `1440x900` y mobile `390x844`, sin login residual, sin overlay, sin console/runtime/network errors. Screenshots fuera del repo: `C:\Users\Juanito\AppData\Local\Temp\shineapp-ui009-dashboard-qa-2026-05-20T15-22-57-401Z\*.png`.
- Cuarto corte UI-009 aplicado 2026-05-20: la seccion `Configuracion > Negocio` quedo extraida a `frontend/app/components/settings/BusinessSettingsPanel.tsx` sin cambios intencionales de UI ni negocio. `page.tsx` conserva estado, guardado, logo picker y callbacks; el componente concentra la card de negocio, logo y formulario publico. Conteo post-corte: `page.tsx` tiene 16.654 lineas y aprox. 161 coincidencias `render*`; `BusinessSettingsPanel.tsx` concentra 351 lineas. Validacion: `npm run build` paso limpio; build adicional con `NEXT_PUBLIC_API_URL=http://localhost:9001/api` paso para QA local. Runtime QA: backend/db levantados con `docker compose up -d db backend`, `next start` en `9000`, `/?section=settings&settings=business` en desktop `1440x900` y mobile `390x844`, sin login residual, sin overlay, sin console/runtime/network errors. Screenshots fuera del repo: `C:\Users\Juanito\AppData\Local\Temp\shineapp-ui009-settings-business-qa-2026-05-20T17-24-07-396Z\*.png`.
- Quinto corte UI-009 aplicado 2026-05-20: el resto de `Configuracion` quedo extraido a `frontend/app/components/settings/SettingsWorkspace.tsx` sin cambios intencionales de UI ni negocio. `page.tsx` conserva estado, filtros, guardado, callbacks, carga de datos y permisos; el componente concentra tabs y paneles de Cotizaciones, Caja, Agenda, Usuarios e Historial, reutilizando `BusinessSettingsPanel`. Conteo post-corte: `page.tsx` tiene 16.040 lineas y aprox. 158 coincidencias `render*`; `SettingsWorkspace.tsx` concentra 890 lineas presentacionales. Validacion: `npm run build` paso limpio. Runtime QA autenticada: backend/db con `docker compose up -d db backend`, `next start` en `9000`, deep-links `/?section=settings&settings=quotes|cash|agenda|users|history` en desktop `1440x900` y mobile `390x844`, sin login residual, sin overlay y sin console errors. Screenshots fuera del repo: `C:\Users\Juanito\AppData\Local\Temp\shineapp-ui009-settings-qa-2026-05-20\desktop-quotes.png` y `...\mobile-history.png`.
- Sexto corte UI-009 aplicado 2026-05-20: Inventario quedo extraido a `frontend/app/components/inventory/InventoryPanel.tsx` sin cambios intencionales de UI ni negocio. `page.tsx` conserva calculos, helpers, side effects, callbacks, modales y persistencia; el componente concentra la seccion de Materiales, metricas, movimientos, proveedores, materiales, unidades abiertas, compras y consumos. Conteo post-corte: `page.tsx` tiene 15.659 lineas y aprox. 154 coincidencias `render*`; `InventoryPanel.tsx` concentra 429 lineas presentacionales. Validacion: `npm run build` paso limpio. Runtime QA autenticada: `/?section=inventory` cargo en desktop `1440x900` y mobile `390x844`, sin login residual, sin overlay y sin console errors en Browser. Screenshots fuera del repo capturados con Chrome headless CDP porque Browser fallo en `Page.captureScreenshot`: `C:\Users\Juanito\AppData\Local\Temp\shineapp-ui009-inventory-qa-2026-05-20-cdp\desktop-inventory.png` y `...\mobile-inventory.png`.
- Corte UI-024 aplicado 2026-05-20 y revalidado 2026-05-20: `.mode-toggle` usa tokens `--segmented-*`, `--segmented-count` y estados hover/focus/selected compartidos light/dark. Validacion: `npm run build` paso limpio despues de cerrar un `next dev` externo de `ShineApp/frontend` y limpiar `.next`; build adicional con `NEXT_PUBLIC_API_URL=http://localhost:8000/api` tambien paso para QA local. QA visual autenticada quedo bloqueada por entorno: `next start` no pudo tomar `9000` por `EADDRINUSE` de un `npm run dev` externo, y Codex Browser bloqueo `http://localhost:9000` y `http://127.0.0.1:9000` con `net::ERR_BLOCKED_BY_CLIENT`.

## Vigentes P0/P1

No quedaron P0 reproducidos en runtime estable. Como P1/P2 estructural queda la extraccion gradual del frontend; no bloquea este batch porque requiere un corte tecnico separado.

| ID | Prioridad | Pantalla | Problema vigente | Evidencia real | Siguiente accion |
| --- | --- | --- | --- | --- | --- |
| UI-009 | P1/P2 | App shell / frontend | Reducido a ~75% completo: Caja, Deudas, Dashboard, Configuracion completa e Inventario ya no viven como bloques JSX dentro de `frontend/app/page.tsx`, pero el archivo sigue concentrando Herramientas, Cotizaciones/Servicios, formularios, detalles y calculos. | Conteo post-Inventario: `frontend/app/page.tsx` tiene 15.659 lineas y aprox. 154 coincidencias `render*`; componentes extraidos: `CashPanel.tsx`, `DebtPanel.tsx`, `DashboardPanel.tsx`, `BusinessSettingsPanel.tsx`, `SettingsWorkspace.tsx` e `InventoryPanel.tsx`. | Deuda restante <=25% para UI-009: continuar con Herramientas y Cotizaciones/Servicios; luego evaluar formularios/detail renders compartibles. |

## Cerrados en codigo / QA

| ID | Estado | Evidencia |
| --- | --- | --- |
| UI-001 Shell mobile / drawer | Cerrado | `SidebarNav` usa `data-mobile-open`; `page.tsx` tiene toggle y backdrop; `shell.css` abre/cierra sidebar fixed en mobile. QA mobile dark confirmo drawer visible, sin blank ni body overflow. |
| UI-002 Settings mobile tabs | Cerrado | `shell.css` convierte tabs de settings a grid responsive y una columna en ancho chico. La auditoria no reprodujo overflow horizontal de settings. |
| UI-004 Sidebar search muerto | Cerrado | `SidebarNav` ya no contiene input de busqueda. La busqueda visible vive en clientes, donde QA confirmo interaccion `ana` sin errores. |
| UI-005 Agenda naming | Cerrado | Navegacion principal y seccion usan `Agenda`. La etiqueta residual `Trabajos` aparece como concepto de dominio dentro de agenda, no como IA principal. |
| UI-006 Acciones de cards/listas | Cerrado en superficies auditadas | `RecordCard` separa accion primaria de acciones secundarias; `CustomerListPanel` mantiene dashboard/acciones separadas. Mantener vigilancia en nuevas listas. |
| UI-007 Modal accesible base | Cerrado | `ModalFrame` tiene `role="dialog"`, `aria-modal`, `aria-labelledby`, cierre con Escape y test de foco en `ui.test.tsx`. |
| UI-011 Encoding `Â·` | Cerrado | `rg -F "Â·" frontend/app frontend/lib` no encontro ocurrencias en fuente UI. Solo queda mencionado en docs historicas. |
| UI-013 Deep-linking | Cerrado | `navigation-state.ts` define `section` en URL; `page.tsx` sincroniza `pushState`/`popstate`. QA navego `?section=agenda`, `customers`, `cash`, `settings&settings=business`. |
| UI-020 Runtime visual productivo | Cerrado para auditoria | Build productivo y `next start` cargaron login, app privada y landing publica sin errores de consola. La inestabilidad observada fue de Browser plugin, no de app. |
| UI-025 Landing publica iconos | Cerrado 2026-05-20 | `PublicLandingClient.tsx` mapea `combo`, `polish`, `shield` y `seat` a iconos Lucide con fallback inicial; ya no se imprime la clave cruda del servicio. |
| UI-021 Dark settings segmented | Cerrado 2026-05-20 | `shell.css` agrega estados dark para `.mode-toggle`: fondo, texto, hover/focus y selected con contraste legible. |
| UI-003 Agenda mobile | Cerrado como corte minimo 2026-05-20 | `agenda.css` mantiene tablero horizontal, pero agrega scroll contenido, snap por dia y affordance visible `Mas dias ->`; una vista compacta por dia queda como mejora P2 si se prioriza. |
| UI-008 SearchSelect accesible | Cerrado 2026-05-20 | `SearchSelect.tsx` elimina `autoFocus`, agrega ids activos para combobox/listbox, `aria-activedescendant` y estado live para resultados vacios. |
| UI-012 Login demo prefill | Cerrado 2026-05-20 | `loginInitialCredentials` queda vacio en modo normal; el modo demo solo puede prellenar usuario con `NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN=1` y no prellena password. |
| UI-016 Caja hierarchy | Cerrado como corte visual 2026-05-20 | `shell.css` separa jerarquia de metricas, resumen, filtros y listado de caja sin cambiar acciones, filtros ni reglas de negocio. |

## Vigentes P2 / deuda diferible

| ID | Prioridad | Pantalla | Deuda | Evidencia / nota |
| --- | --- | --- | --- | --- |
| UI-010 | P2 | Theme switch | El switch de tema sigue como outlier visual con varios hex directos y estados custom. | `frontend/app/styles/shell.css` conserva reglas especificas para `.theme-switch`. |
| UI-014 | P2 | Configuracion / branding | Card de logo y negocio puede mejorar densidad y lectura, especialmente en dark mode. | QA settings dark no bloqueo flujo, pero la pantalla sigue pesada para configuracion frecuente. |
| UI-015 | P2 | Dashboard | La pantalla carga estable, pero puede mejorar siguiente accion y priorizacion de datos. | QA dashboard desktop sin errores; mejora de producto, no bloqueo. |
| UI-017 | P2 | Clientes | El dashboard de clientes funciona, pero low-data/empty guidance puede ser mas accionable. | QA busqueda de cliente sin errores; queda como polish operativo. |
| UI-018 | P2 | Estados de vacio/carga | Existen primitivos, pero no todos los estados de carga/vacio tienen accion clara o copy consistente. | No se reprodujo blank/loading roto en QA; queda como deuda transversal. |
| UI-019 | P2 | Vehiculos | Se mantiene seccion oculta por CSS/estado, lo que agrega ruido de mantenimiento. | Codigo conserva `hidden-section` en shell/base. |
| UI-022 | P2 | Sidebar footer/profile mobile | Drawer resuelto, pero footer/perfil mobile puede compactarse mejor. | QA no bloqueo navegacion; polish visual. |
| UI-023 | P2 | Bulk workflows | Acciones masivas y feedback pueden ser mas consistentes. | No bloquea flujos QA cubiertos. |
| UI-024 | P2 | Segmented controls | Reducido como corte tecnico: tokens y estados compartidos ya existen; build 2026-05-20 limpio. | Queda como deuda residual revalidar visualmente settings/agenda cuando Browser/local runtime permitan QA completa; el intento actual quedo bloqueado por `EADDRINUSE` en `next start` y `net::ERR_BLOCKED_BY_CLIENT` en Browser. |

## Evidencia de auditoria

Comando de build validado:

```powershell
cd frontend
npm run build
```

Resumen QA automatizado:

- Login desktop: submit real con `admin/admin123`, redireccion a dashboard.
- Dashboard desktop: pagina no vacia, sin overlay.
- Agenda desktop: deep-link `/?section=agenda`, pagina no vacia, sin overlay.
- Clientes desktop: deep-link `/?section=customers`, busqueda `ana`, sin errores.
- Caja desktop: deep-link `/?section=cash`, sin errores.
- Configuracion desktop: deep-link `/?section=settings&settings=business`, sin errores.
- Dark mode: toggle ejecutado, `data-theme="dark"` confirmado.
- Mobile: drawer abierto, `data-mobile-open="true"` confirmado.
- Landing publica: `/publica/default` renderiza, sin errores HTTP, con issue visible UI-025.
