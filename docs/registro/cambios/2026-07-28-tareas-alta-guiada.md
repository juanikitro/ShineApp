# Alta guiada sincronizada con Tareas

## Cambio funcional

Cada negocio recibe seis tareas de onboarding vinculadas por un ID estable:
`business`, `services`, `turnera`, `whatsapp`, `agenda` y `cash-dashboard`.
Las tareas aparecen sin asignado ni vencimiento y el listado de Tareas conserva
las completadas vinculadas visibles junto a los pendientes iniciales.

El Dashboard usa el estado de esas tareas vinculadas para mostrar la misma alta
guiada. Sus acciones continúan navegando a Configuracion, Servicios, Agenda o
Caja: no completan una tarea de forma artificial.

## Regla de estado

El backend calcula el estado desde datos reales del negocio: perfil y contacto,
servicios/sectores vehiculares, turnera publica, configuracion de WhatsApp,
reservas/ordenes/solicitudes publicas y pagos o ingresos de caja. Las mutaciones
de esas superficies programan la sincronizacion despues del commit; las lecturas
no escriben tareas.

Editar o eliminar manualmente una tarea vinculada queda rechazado. Las acciones
de completar y reabrir no cambian el estado por si mismas: recalculan la
proyeccion desde el requisito real. Si la accion solicitada contradice esos
hechos, la API responde un error accionable; si ya coincide, responde la tarea
con su estado proyectado actual. Si un paso se descarta desde la alta guiada, su
tarea se soft-deletea.

## Contrato API y migracion

`GET /api/tasks/` y el detalle exponen `onboarding_step_id` como campo de solo
lectura. La migracion `tasks.0005_task_onboarding_step` crea las tareas faltantes
para negocios existentes sin tocar tareas manuales, asignados ni vencimientos, y
aplica una unicidad parcial por negocio/paso mientras `deleted_at` sea nulo.

## Validacion

- `backend/.venv/Scripts/python.exe -m pytest tests/test_onboarding_tasks.py tests/test_tasks.py -q`
- `npm exec vitest -- run lib/demo-readiness.test.mjs app/components/tasks/TasksPanel.test.tsx --maxWorkers=1`
