# UI / UX Improvement Backlog - ShineApp

Backlog priorizado a partir de la re-auditoria del 2026-05-20. Los quick wins historicos cerrados salen de "Ahora" para que el siguiente batch refleje deuda vigente real.

## Ahora - siguiente batch recomendado

| Orden | ID | Prioridad | Area | Objetivo | Evidencia | Resultado esperado |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | UI-024 | P2 | Segmented controls | Consolidar tokens y estados de segmented/tabs despues del fix dark urgente. | UI-021 cubrio dark de `.mode-toggle`, pero quedan variantes dispersas; UI-009 ya tuvo un primer corte tecnico en Caja. | Patron comun reutilizable para tabs/segmented. |
| 2 | UI-009 | P1/P2 | Arquitectura frontend | Continuar extraccion por vertical de `frontend/app/page.tsx` sin mezclar redisenos. | Primer corte: Caja se movio a `frontend/app/components/cash/CashPanel.tsx`; `page.tsx` sigue grande con 17.570 lineas y aprox. 164 `render*`. | Menos riesgo de regresion y cambios UI mas faciles de validar. |
| 3 | UI-015 | P2 | Dashboard | Mejorar siguiente accion y priorizacion de datos. | QA dashboard estable; queda deuda de producto, no bloqueo. | Dashboard mas accionable sin cambiar contratos. |
| 4 | UI-017 | P2 | Clientes | Pulir low-data/empty states y CTA operativo. | QA clientes estable con busqueda; queda polish operativo. | Mejor guia cuando hay pocos datos o resultados. |
| 5 | UI-018 | P2 | Estados transversales | Consolidar loading/empty/error states por modulo. | Existen primitives, pero el uso no es homogeneo. | Feedback mas consistente entre pantallas. |
| 6 | UI-014 | P2 | Configuracion branding | Mejorar densidad/card de logo y negocio. | Settings funciona en dark y mobile; queda deuda visual diferible. | Configuracion mas escaneable sin redisenar. |

## Cerrado por batch P1 2026-05-20

| ID | Area | Resultado |
| --- | --- | --- |
| UI-025 | Landing publica | Iconos de servicios mapeados a Lucide y fallback inicial seguro; sin claves crudas visibles. |
| UI-021 | Dark mode / configuracion | Estados dark de `.mode-toggle` con texto, hover/focus y selected legibles. |
| UI-003 | Agenda mobile | Tablero ancho queda como scroll horizontal contenido, con snap y affordance visible. |
| UI-008 | Formularios | `SearchSelect` sin `autoFocus`, con combobox/listbox ids activos y estado live en vacio. |
| UI-012 | Login | Modo normal sin credenciales prellenadas; demo solo por env flag y sin password. |
| UI-016 | Caja | Jerarquia visual de metricas, filtros y listado reforzada por CSS sin tocar negocio. |
| UI-009 | Caja / arquitectura frontend | Parcialmente reducido: render de Caja extraido a `CashPanel.tsx`; estado, callbacks, payloads y reglas siguen en `page.tsx`. |

## Cerrado por auditoria 2026-05-20

| Item historico | Estado | Evidencia |
| --- | --- | --- |
| Shell mobile / drawer | Cerrado | Drawer mobile abre/cierra con `data-mobile-open`; QA mobile dark sin body overflow ni overlay bloqueante. |
| Settings mobile tabs | Cerrado | CSS responsive convierte tabs a grid/columna; QA no reprodujo overflow. |
| Sidebar search muerto | Cerrado | `SidebarNav` ya no tiene input de busqueda; search real en clientes funciona. |
| Agenda naming | Cerrado | IA principal usa `Agenda`; `Trabajos` queda como concepto de dominio dentro de la agenda. |
| Modal accesible base | Cerrado | `ModalFrame` incluye dialog semantics, Escape y test de foco. |
| Deep-linking | Cerrado | Navegacion por `?section=...` funciona en QA y codigo. |
| Encoding `Â·` | Cerrado | No quedan ocurrencias en `frontend/app` ni `frontend/lib`. |
| Cards/list actions en superficies auditadas | Cerrado | `RecordCard` y `CustomerListPanel` separan accion primaria/secundarias. |
| Runtime visual productivo | Cerrado para auditoria | `npm run build` + `npm run start` renderizaron flujos principales y landing publica. |

## Despues - deuda diferible

| ID | Prioridad | Area | Motivo |
| --- | --- | --- | --- |
| UI-009 | P1/P2 | Arquitectura frontend | Primer corte aplicado en Caja; quedan otras verticales y estado/calculo todavia concentrados en `page.tsx`. |
| UI-010 | P2 | Theme switch | Outlier de estilos y hex directos; no bloqueo QA. |
| UI-014 | P2 | Configuracion branding | Mejorar densidad/card de logo sin redisenar el flujo. |
| UI-015 | P2 | Dashboard | Reforzar siguiente accion y low-data guidance. |
| UI-017 | P2 | Clientes | Pulir low-data/empty states y CTA operativo. |
| UI-018 | P2 | Estados transversales | Consolidar loading/empty/error states por modulo. |
| UI-019 | P2 | Vehiculos ocultos | Eliminar o formalizar `hidden-section` para reducir deuda de mantenimiento. |
| UI-022 | P2 | Sidebar footer mobile | Compactar perfil/footer sin tocar el drawer ya cerrado. |
| UI-023 | P2 | Bulk workflows | Homogeneizar feedback de acciones masivas. |
| UI-024 | P2 | Segmented controls | Consolidar tokens/estados; la parte urgente esta cubierta por UI-021. |

## Notas de ejecucion

- No agregar tests si el siguiente cambio es solo docs.
- Si se toca codigo UI, validar al menos `cd frontend && npm run build` y un smoke browser del flujo afectado.
- Guardar screenshots fuera del repo salvo que se pida evidencia versionada.
- No reabrir como P0 ningun item que no pueda reproducirse en runtime estable.
