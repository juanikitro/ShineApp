# UI / UX Issues - ShineApp

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

## Vigentes P0/P1

No quedaron P0 reproducidos en runtime estable. Los items siguientes siguen vigentes como P1 porque afectan flujos operativos, accesibilidad, confianza de demo o superficie publica.

| ID | Prioridad | Pantalla | Problema vigente | Evidencia real | Siguiente accion |
| --- | --- | --- | --- | --- | --- |
| UI-003 | P1 | Agenda mobile | La agenda ya no rompe el body ni bloquea el drawer, pero el tablero sigue dependiendo de un ancho minimo grande en mobile. | QA mobile dark: `bodyScrollWidth=390`, `bodyClientWidth=390`, pero `boardMinWidth=860px`, `boardClientWidth=860`, viewport interno `358px`. Codigo: `frontend/app/styles/agenda.css` conserva `min-width` mobile en `.week-board`. Screenshot: `07-agenda-mobile-dark-drawer.png`. | Definir un patron mobile real para agenda: scroll contenido explicito con affordance, vista compacta por dia o columnas adaptativas. |
| UI-008 | P1 | SearchSelect / formularios | `SearchSelect` sigue siendo un combobox custom con semantica incompleta y `autoFocus` dentro del popover. | Codigo: `frontend/app/components/ui/SearchSelect.tsx` usa `aria-haspopup="listbox"`, `role="listbox"` y `autoFocus`; no expone el contrato completo de combobox/listbox activo. | Completar semantica WAI-ARIA, foco inicial no intrusivo y navegacion de teclado verificable. |
| UI-009 | P1 | App shell / frontend | `frontend/app/page.tsx` sigue concentrando demasiada responsabilidad de UI, estado y render. | Conteo auditado: `frontend/app/page.tsx` tiene 18.679 lineas y aprox. 176 coincidencias `render*`. | Extraer por vertical despues de cerrar deuda visible: agenda, clientes, caja, settings. |
| UI-012 | P1 | Login | El login sigue prellenado con credenciales demo (`admin` / `admin123`). Autocomplete esta corregido, pero la confianza de demo/prod queda afectada. | QA login desktop muestra campos prellenados. Codigo: estado inicial en `frontend/lib/page-support.tsx` mantiene credenciales demo. | Hacer prefill solo en modo demo/dev documentado o moverlo a accion explicita "Usar demo". |
| UI-016 | P1 | Caja | La pantalla carga y opera, pero la jerarquia visual sigue densa: resumen, filtros, acciones y lista compiten en una misma superficie. | QA desktop: navegacion a `/?section=cash` sin errores ni overlays; screenshot `05-caja-desktop-light.png` conserva alto ruido visual. | Reordenar jerarquia: accion primaria, filtros compactos y estados de caja separados de listado. |
| UI-021 | P1 | Configuracion / dark mode | Dark mode funciona, pero controles segmentados/tabs de configuracion tienen contraste bajo en estado no seleccionado. | QA dark: `data-theme="dark"` activo; screenshot `06-configuracion-desktop-dark.png` muestra tabs con texto oscuro sobre fondo oscuro. Codigo: reglas de `.settings-tabs` / `.mode-toggle` no cubren suficientes estados dark. | Ajustar tokens dark para tabs/segmented controls y validar contraste AA. |
| UI-025 | P1 | Landing publica | Los servicios renderizan claves de icono crudas como texto visible (`combo`, `polish`, `shield`, `seat`) y se parten dentro del badge. | QA mobile `/publica/default`: screenshot `08-public-landing-mobile.png`. Codigo: `frontend/app/publica/[slug]/PublicLandingClient.tsx` imprime `{service.icon || 'S'}` directo. | Mapear claves a iconos/simbolos reales o fallback inicial seguro, con dimensiones estables. |

## Cerrados en codigo / QA

| ID | Estado | Evidencia |
| --- | --- | --- |
| UI-001 Shell mobile / drawer | Cerrado | `SidebarNav` usa `data-mobile-open`; `page.tsx` tiene toggle y backdrop; `shell.css` abre/cierra sidebar fixed en mobile. QA mobile dark confirmo drawer visible, sin blank ni body overflow. |
| UI-002 Settings mobile tabs | Cerrado | `shell.css` convierte tabs de settings a grid responsive y una columna en ancho chico. La auditoria no reprodujo overflow horizontal de settings. |
| UI-004 Sidebar search muerto | Cerrado | `SidebarNav` ya no contiene input de busqueda. La busqueda visible vive en clientes, donde QA confirmo interaccion `ana` sin errores. |
| UI-005 Agenda naming | Cerrado | Navegacion principal y seccion usan `Agenda`. La etiqueta residual `Trabajos` aparece como concepto de dominio dentro de agenda, no como IA principal. |
| UI-006 Cards/list actions | Cerrado en superficies auditadas | `RecordCard` separa accion primaria de acciones secundarias; `CustomerListPanel` mantiene dashboard/acciones separadas. Mantener vigilancia en nuevas listas. |
| UI-007 Modal accesible base | Cerrado | `ModalFrame` tiene `role="dialog"`, `aria-modal`, `aria-labelledby`, cierre con Escape y test de foco en `ui.test.tsx`. |
| UI-011 Encoding `Â·` | Cerrado | `rg -F "Â·" frontend/app frontend/lib` no encontro ocurrencias en fuente UI. Solo queda mencionado en docs historicas. |
| UI-013 Deep-linking | Cerrado | `navigation-state.ts` define `section` en URL; `page.tsx` sincroniza `pushState`/`popstate`. QA navego `?section=agenda`, `customers`, `cash`, `settings&settings=business`. |
| UI-020 Runtime visual productivo | Cerrado para auditoria | Build productivo y `next start` cargaron login, app privada y landing publica sin errores de consola. La inestabilidad observada fue de Browser plugin, no de app. |

## Vigentes P2 / deuda diferible

| ID | Prioridad | Pantalla | Deuda | Evidencia / nota |
| --- | --- | --- | --- | --- |
| UI-010 | P2 | Theme switch | El switch de tema sigue como outlier visual con varios hex directos y estados custom. | `frontend/app/styles/shell.css` conserva reglas especificas para `.theme-switch`. |
| UI-014 | P2 | Configuracion / branding | Card de logo y negocio puede mejorar densidad y lectura, especialmente en dark mode. | QA settings dark no bloqueo flujo, pero la pantalla sigue pesada para configuracion frecuente. |
| UI-015 | P2 | Dashboard | La pantalla carga estable, pero puede mejorar siguiente accion y priorizacion de datos. | QA dashboard desktop sin errores; mejora de producto, no bloqueo. |
| UI-017 | P2 | Clientes | El dashboard de clientes funciona, pero low-data/empty guidance puede ser mas accionable. | QA busqueda de cliente sin errores; queda como polish operativo. |
| UI-018 | P2 | Empty/loading states | Existen primitivos, pero no todos los estados de carga/empty tienen accion clara o copy consistente. | No se reprodujo blank/loading roto en QA; queda como deuda transversal. |
| UI-019 | P2 | Vehiculos | Se mantiene seccion oculta por CSS/estado, lo que agrega ruido de mantenimiento. | Codigo conserva `hidden-section` en shell/base. |
| UI-022 | P2 | Sidebar footer/profile mobile | Drawer resuelto, pero footer/perfil mobile puede compactarse mejor. | QA no bloqueo navegacion; polish visual. |
| UI-023 | P2 | Bulk workflows | Acciones masivas y feedback pueden ser mas consistentes. | No bloquea flujos QA cubiertos. |
| UI-024 | P2 | Segmented controls | Varios segmented/tabs comparten patron, pero falta consolidar tokens y estados. | Se conecta con UI-021; la parte bloqueante es contraste dark. |

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
