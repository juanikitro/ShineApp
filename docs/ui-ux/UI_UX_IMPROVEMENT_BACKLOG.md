# Backlog De Mejoras UI/UX - ShineApp

Backlog priorizado a partir de la re-auditoria del 2026-05-20. Los quick wins historicos cerrados salen de "Ahora" para que el siguiente batch refleje deuda vigente real.

## Ahora - siguiente batch recomendado

| Orden | ID | Prioridad | Area | Objetivo | Evidencia | Resultado esperado |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | UI-009 | P1/P2 | Arquitectura frontend | Continuar extraccion por vertical de `frontend/app/page.tsx` sin mezclar redisenos. | Cortes aplicados: Caja en `components/cash/CashPanel.tsx`, Deudas en `components/debts/DebtPanel.tsx`, Dashboard en `components/dashboard/DashboardPanel.tsx`, Configuracion completa en `components/settings/*` e Inventario en `components/inventory/InventoryPanel.tsx`; `page.tsx` sigue grande con 15.659 lineas y aprox. 154 `render*`. | UI-009 queda >=75% completo; siguiente corte recomendado si se sigue: Herramientas o Cotizaciones/Servicios. |

No quedan items no UI-009 en "Ahora". UI-009 queda listado solo como deuda estructural excluida del batch 2026-05-20.

## Cerrado por batch P1 2026-05-20

| ID | Area | Resultado |
| --- | --- | --- |
| UI-025 | Landing publica | Iconos de servicios mapeados a Lucide y fallback inicial seguro; sin claves crudas visibles. |
| UI-021 | Dark mode / configuracion | Estados dark de `.mode-toggle` con texto, hover/focus y selected legibles. |
| UI-003 | Agenda mobile | Tablero ancho queda como scroll horizontal contenido, con snap y affordance visible. |
| UI-008 | Formularios | `SearchSelect` sin `autoFocus`, con combobox/listbox ids activos y estado live en vacio. |
| UI-012 | Login | Modo normal sin credenciales prellenadas; demo solo por env flag y sin password. |
| UI-016 | Caja | Jerarquia visual de metricas, filtros y listado reforzada por CSS sin tocar negocio. |
| UI-009 | Caja + Deudas + Dashboard + Settings completo + Inventario / arquitectura frontend | Reducido a >=75%: renders de Caja, Deudas, Dashboard, Configuracion completa e Inventario extraidos a `CashPanel.tsx`, `DebtPanel.tsx`, `DashboardPanel.tsx`, `BusinessSettingsPanel.tsx`, `SettingsWorkspace.tsx` e `InventoryPanel.tsx`; estado, callbacks, payloads y reglas siguen en `page.tsx`. |
| UI-024 | Segmented controls | `.mode-toggle` consume tokens `--segmented-*`, usa `--segmented-count`, comparte estados hover/focus/selected light/dark y quedo revalidado visualmente en settings dark. |
| UI-010 | Theme switch | `.theme-switch` ahora usa tokens `--theme-switch-*` light/dark; se elimino el outlier de hex directos en reglas del switch. |
| UI-014 | Configuracion branding | Card de logo/negocio mas densa y escaneable en `BusinessSettingsPanel` + CSS, sin cambiar flujo ni persistencia. |
| UI-015 | Dashboard | Card `Siguiente accion` prioriza cobros, deudas vencidas, ausencia de trabajos o agenda del dia sin tocar contratos. |
| UI-017 | Clientes | Guidance low-data con CTA para sumar clientes y empty filtrado mantenido para busquedas sin resultados. |
| UI-018 | Estados transversales | Variantes loading/error de `state-notice` usan tokens de estado y copy/jerarquia consistente. |
| UI-019 | Vehiculos ocultos | Se elimino `hidden-section`; QA vehiculos confirma que no quedan secciones ocultas por esa clase. |
| UI-022 | Sidebar footer mobile | Footer mobile separa perfil y switch en grid compacto; QA `390x844` sin solapamiento perfil/switch. |
| UI-023 | Bulk workflows | Solicitudes publicas pendientes/gestionadas tienen feedback de resolucion y CTA consistente para convertir. |

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
| UI-009 | P1/P2 | Arquitectura frontend | Cortes aplicados en Caja, Deudas, Dashboard, Settings completo e Inventario; quedan Herramientas, Cotizaciones/Servicios, estado, formularios y calculos todavia concentrados en `page.tsx`. |

No quedan deudas diferibles no UI-009 abiertas en este backlog al cierre del batch.

## Notas de ejecucion

- No agregar tests si el siguiente cambio es solo docs.
- Si se toca codigo UI, validar al menos `cd frontend && npm run build` y un smoke browser del flujo afectado.
- Guardar screenshots fuera del repo salvo que se pida evidencia versionada.
- No reabrir como P0 ningun item que no pueda reproducirse en runtime estable.
