# Backlog De Mejoras UI/UX - ShineApp

Backlog priorizado a partir de la re-auditoria del 2026-05-20. Los quick wins historicos cerrados salen de "Ahora" para que el siguiente batch refleje deuda vigente real.

## Ahora - siguiente batch recomendado

| Orden | ID | Prioridad | Area | Objetivo | Evidencia | Resultado esperado |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | UI-009 | P1/P2 | Arquitectura frontend | Continuar extraccion por vertical de `frontend/app/page.tsx` sin mezclar redisenos. | Cortes aplicados: Caja en `components/cash/CashPanel.tsx`, Deudas en `components/debts/DebtPanel.tsx`, Dashboard en `components/dashboard/DashboardPanel.tsx`, Configuracion completa en `components/settings/*`, Inventario en `components/inventory/InventoryPanel.tsx` y Herramientas en `components/tools/ToolsPanel.tsx`; `page.tsx` sigue grande con 15.024 lineas y aprox. 155 `render*`. | UI-009 queda ~85% completo; siguiente corte recomendado: Cotizaciones/Servicios. |
| 2 | UI-015 | P2 | Dashboard | Mejorar siguiente accion y priorizacion de datos. | QA dashboard estable; queda deuda de producto, no bloqueo. | Dashboard mas accionable sin cambiar contratos. |
| 3 | UI-017 | P2 | Clientes | Pulir low-data/empty states y CTA operativo. | QA clientes estable con busqueda; queda polish operativo. | Mejor guia cuando hay pocos datos o resultados. |
| 4 | UI-018 | P2 | Estados transversales | Consolidar loading/empty/error states por modulo. | Existen primitives, pero el uso no es homogeneo. | Feedback mas consistente entre pantallas. |
| 5 | UI-014 | P2 | Configuracion branding | Mejorar densidad/card de logo y negocio. | Settings funciona en dark y mobile; queda deuda visual diferible. | Configuracion mas escaneable sin redisenar. |
| 6 | UI-024 | P2 | Segmented controls | Revalidar visualmente el corte de tokens cuando Browser/local runtime permitan QA completa. | Tokens y estados `--segmented-*` ya aplicados; build 2026-05-20 paso limpio. QA visual quedo bloqueada por `next start` con `EADDRINUSE` en `9000` y Browser con `net::ERR_BLOCKED_BY_CLIENT` en `localhost`/`127.0.0.1`. | Cerrar deuda residual de evidencia, no de implementacion. |

## Cerrado por batch P1 2026-05-20

| ID | Area | Resultado |
| --- | --- | --- |
| UI-025 | Landing publica | Iconos de servicios mapeados a Lucide y fallback inicial seguro; sin claves crudas visibles. |
| UI-021 | Dark mode / configuracion | Estados dark de `.mode-toggle` con texto, hover/focus y selected legibles. |
| UI-003 | Agenda mobile | Tablero ancho queda como scroll horizontal contenido, con snap y affordance visible. |
| UI-008 | Formularios | `SearchSelect` sin `autoFocus`, con combobox/listbox ids activos y estado live en vacio. |
| UI-012 | Login | Modo normal sin credenciales prellenadas; demo solo por env flag y sin password. |
| UI-016 | Caja | Jerarquia visual de metricas, filtros y listado reforzada por CSS sin tocar negocio. |
| UI-009 | Caja + Deudas + Dashboard + Settings completo + Inventario + Herramientas / arquitectura frontend | Reducido a ~85%: renders de Caja, Deudas, Dashboard, Configuracion completa, Inventario y Herramientas extraidos a `CashPanel.tsx`, `DebtPanel.tsx`, `DashboardPanel.tsx`, `BusinessSettingsPanel.tsx`, `SettingsWorkspace.tsx`, `InventoryPanel.tsx` y `ToolsPanel.tsx`; estado, callbacks, payloads y reglas siguen en `page.tsx`. |
| UI-024 | Segmented controls | Reducido: `.mode-toggle` consume tokens `--segmented-*`, usa `--segmented-count` y comparte estados hover/focus/selected light/dark. |

## Cerrado por auditoria 2026-05-20

| Item historico | Estado | Evidencia |
| --- | --- | --- |
| Shell mobile / drawer | Cerrado | Drawer mobile abre/cierra con `data-mobile-open`; QA mobile dark sin body overflow ni overlay bloqueante. |
| Settings mobile tabs | Cerrado | CSS responsive convierte tabs a grid/columna; QA no reprodujo overflow. |
| Sidebar search muerto | Cerrado | `SidebarNav` ya no tiene input de busqueda; search real en clientes funciona. |
| Agenda naming | Cerrado | IA principal usa `Agenda`; `Trabajos` queda como concepto de dominio dentro de la agenda. |
| Modal accesible base | Cerrado | `ModalFrame` incluye semantica de dialog, Escape y test de foco. |
| Deep-linking | Cerrado | Navegacion por `?section=...` funciona en QA y codigo. |
| Encoding `Â·` | Cerrado | No quedan ocurrencias en `frontend/app` ni `frontend/lib`. |
| Acciones de cards/listas en superficies auditadas | Cerrado | `RecordCard` y `CustomerListPanel` separan accion primaria/secundarias. |
| Runtime visual productivo | Cerrado para auditoria | `npm run build` + `npm run start` renderizaron flujos principales y landing publica. |

## Despues - deuda diferible

| ID | Prioridad | Area | Motivo |
| --- | --- | --- | --- |
| UI-009 | P1/P2 | Arquitectura frontend | Cortes aplicados en Caja, Deudas, Dashboard, Settings completo, Inventario y Herramientas; quedan Cotizaciones/Servicios, estado, formularios y calculos todavia concentrados en `page.tsx`. |
| UI-010 | P2 | Theme switch | Outlier de estilos y hex directos; no bloqueo QA. |
| UI-014 | P2 | Configuracion branding | Mejorar densidad/card de logo sin redisenar el flujo. |
| UI-015 | P2 | Dashboard | Reforzar siguiente accion y low-data guidance. |
| UI-017 | P2 | Clientes | Pulir low-data/empty states y CTA operativo. |
| UI-018 | P2 | Estados transversales | Consolidar loading/empty/error states por modulo. |
| UI-019 | P2 | Vehiculos ocultos | Eliminar o formalizar `hidden-section` para reducir deuda de mantenimiento. |
| UI-022 | P2 | Sidebar footer mobile | Compactar perfil/footer sin tocar el drawer ya cerrado. |
| UI-023 | P2 | Bulk workflows | Homogeneizar feedback de acciones masivas. |
| UI-024 | P2 | Segmented controls | Implementacion de tokens aplicada; build limpio. Queda revalidacion visual autenticada cuando Browser/local runtime no bloqueen el acceso. |

## Notas de ejecucion

- No agregar tests si el siguiente cambio es solo docs.
- Si se toca codigo UI, validar al menos `cd frontend && npm run build` y un smoke browser del flujo afectado.
- Guardar screenshots fuera del repo salvo que se pida evidencia versionada.
- No reabrir como P0 ningun item que no pueda reproducirse en runtime estable.
