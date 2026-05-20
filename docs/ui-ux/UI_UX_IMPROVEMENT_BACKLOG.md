# UI / UX Improvement Backlog - ShineApp

Backlog priorizado a partir de la re-auditoria del 2026-05-20. Los quick wins historicos cerrados salen de "Ahora" para que el siguiente batch refleje deuda vigente real.

## Ahora - siguiente batch recomendado

| Orden | ID | Prioridad | Area | Objetivo | Evidencia | Resultado esperado |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | UI-025 | P1 | Landing publica | Corregir render de iconos de servicios para no mostrar claves crudas (`combo`, `polish`, `shield`, `seat`). | QA `/publica/default` mobile, screenshot `08-public-landing-mobile.png`; `PublicLandingClient.tsx` imprime `service.icon` directo. | Icono/simbolo estable, sin texto partido, sin layout shift. |
| 2 | UI-021 | P1 | Dark mode / configuracion | Ajustar contraste de tabs/segmented controls en dark mode. | QA screenshot `06-configuracion-desktop-dark.png`; `data-theme="dark"` confirmado. | Estados selected/unselected/focus cumplen contraste y se leen claramente. |
| 3 | UI-003 | P1 | Agenda mobile | Resolver la dependencia de tablero ancho en mobile. | QA: `boardMinWidth=860px` con viewport interno `358px`; CSS conserva `min-width`. | Experiencia mobile explicita: vista compacta o scroll contenido con affordance clara. |
| 4 | UI-008 | P1 | Formularios | Completar accesibilidad de `SearchSelect` y revisar `autoFocus`. | Codigo `SearchSelect.tsx`: `role="listbox"`, `aria-haspopup`, `autoFocus`. | Componente usable con teclado/lector y foco predecible. |
| 5 | UI-012 | P1 | Login | Sacar credenciales demo prellenadas del modo normal. | QA login desktop muestra `admin/admin123` prellenado. | Prefill solo en modo demo/dev o accion explicita. |
| 6 | UI-016 | P1 | Caja | Reducir densidad y mejorar jerarquia de accion/filtros/listado. | QA `/?section=cash`, screenshot `05-caja-desktop-light.png`. | Pantalla de caja mas escaneable y con accion primaria clara. |

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
| UI-009 | P1/P2 | Arquitectura frontend | `page.tsx` sigue grande; conviene extraer por vertical luego del batch visible. |
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
