# Reservas vencidas en dashboard y Agenda

Fecha: 2026-07-28

## Regla funcional

- Una reserva esta vencida cuando su fecha limite operativa (`exit_day` o, si falta, `day`) es anterior al dia de caja local y todavia falta entregarla o cobrarla.
- Las reservas canceladas o eliminadas no forman parte del backlog.
- El backlog es global, no depende del periodo elegido en el dashboard, y se ordena por fecha limite e identificador.

## Backend

- `GET /api/reservations/overdue/` devuelve el backlog del negocio autenticado.
- La respuesta incluye datos operativos minimos, fecha limite, dias vencidos y senal de entrega pendiente.
- Los empleadores reciben ademas saldo, senal de cobro pendiente y la orden de trabajo necesaria para abrir el cobro existente.
- Los empleados no reciben importes ni reservas que esten vencidas unicamente por cobro.
- El calculo usa `cash_day(...)` y metricas financieras agrupadas para evitar una consulta por fila.
- OpenAPI describe una respuesta operativa y otra economica, de modo que los campos omitidos a empleados no se publiquen falsamente como obligatorios.

## Frontend

- El dashboard prioriza el bloque `Ahora` con el total de reservas vencidas, una vista previa de tres filas y la accion `Ver todas`.
- Si el backlog se cargo y esta vacio, el dashboard muestra `Agenda al dia`.
- Al entrar a Agenda con vencidas se muestra una notificacion discreta, anunciada como estado no urgente, una sola vez durante la vida de la pagina. La accion `Ver` abre el listado compartido.
- Cada fila abre la edicion de la reserva despues de cargar los datasets de Agenda y consultar el detalle completo; el payload resumido nunca se usa como formulario.
- El cobro reutiliza el modal de pago existente y solo esta disponible para quien puede ver economia.
- Al cerrar o completar una edicion o un cobro se actualiza el backlog. Si quedan filas, vuelve al listado; si se resolvio la ultima, lo cierra y confirma `Agenda al dia`.
- La carga y el estado del backlog permanecen aislados de los datasets normales de cada seccion.
- Los resultados asincronos se invalidan al cambiar de sesion y solo la solicitud mas reciente puede actualizar el backlog.
- Un fallo de carga con el listado cerrado se comunica mediante un toast reintentable, sin abrir el popup ni afirmar que la agenda esta al dia.

## Alcance

- No agrega migraciones, dependencias, cron, workers ni recordatorios persistentes.
- La especificacion fuente esta en `docs/plans/2026-07-28-reservas-vencidas-dashboard-agenda-design.md`.

## Validacion

- Backend focalizado: `py -3 -m pytest tests/test_overdue_reservations.py -q`.
- Frontend focalizado: `npx vitest run lib/overdue-reservations.test.mjs app/components/agenda/OverdueReservationsModal.test.tsx lib/dashboard-next-actions.test.mjs app/components/dashboard/DashboardPanel.test.tsx lib/page-support.test.mjs lib/detail-paths.test.mjs --maxWorkers=1`.
- Tipos: `npm run typecheck` queda condicionado por errores preexistentes en tests de `DemoReadinessPanel` y componentes UI.
- Documentacion: `py -3 scripts/check_docs.py --write --skip-build`.
