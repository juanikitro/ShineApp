# Buscador global integrado al SPA: seccion propia, dropdown lateral y apertura en modales

El buscador global dejaba una experiencia partida: el dropdown se solapaba con el
sidebar, la pagina `/search` era standalone (solo modo claro, sin navegacion del
sistema) y el detalle era una pantalla de solo lectura. Ahora todo vive dentro
del SPA principal.

Cambios:
- Frontend: el dropdown rapido de `GlobalSearchInput` se renderiza en un portal con `position: fixed`, anclado al lado derecho del input (no tapa el sidebar) y con `z-index: calc(var(--z-modal-panel) + 20)` para quedar por encima de todo. Se recalcula la posicion en resize/scroll y se clampa al viewport (en mobile el sidebar tiene `transform`, por eso el portal a `document.body`).
- Frontend: nueva seccion `search` del SPA (`sectionMeta` + `Section` en `page-support.tsx`); los resultados se muestran en `SearchResultsPanel` dentro del workspace, con el mismo shell/tema (claro y oscuro) que el resto de las secciones.
- Frontend: en el listado de resultados cada modulo (Vehiculos, Reservas, etc.) es plegable/desplegable con su contador; el panel tiene su propio input para buscar de nuevo.
- Frontend: click en un resultado (dropdown o listado) navega al modulo correspondiente y abre el modal de edicion de la instancia (`openDetailModal` con el registro traido por API; `fixed_expense` abre el form modal via `openFixedExpenseForEdit`). Para servicios se trae `/service-materials/` antes de abrir para hidratar la receta.
- Frontend: el termino buscado viaja como `?q=` en la URL solo dentro de `?section=search` (sobrevive refresh y back/forward; se limpia al salir).
- Frontend: eliminadas las 11 paginas de detalle standalone (`/customers/[id]`, `/vehicles/[id]`, ...), `DetailPage` y `StandaloneAppLayout`; `/search` queda como redirect de compatibilidad hacia `/?section=search&q=...`.
- Frontend: `data-loading.ts` define la seccion `search` sin datasets propios (solo shell); el endpoint `/search/` se consulta directo desde los componentes.
- Backend: sin cambios; `detail_path` sigue en la respuesta de `/search/` por compatibilidad aunque el frontend ya no lo usa para navegar.
- Fix encontrado al verificar en vivo: los componentes de busqueda ya no pasan `AbortSignal` a `apiFetch`. `apiFetch` deduplica GETs en vuelo por URL y comparte la promesa entre callers, asi que abortar una llamada (p. ej. el doble mount de StrictMode) rechazaba la promesa compartida con `AbortError` y la busqueda inicial quedaba cancelada para siempre. Las respuestas fuera de orden se descartan con un numero de secuencia (`requestSeqRef`), mismo rol que el flag `cancelled` de la pagina vieja.
- Tests: `data-loading.test.mjs` cubre la seccion `search`; nuevo `SearchResultsPanel.test.tsx` (agrupado plegable, submit y guia de query corta).
