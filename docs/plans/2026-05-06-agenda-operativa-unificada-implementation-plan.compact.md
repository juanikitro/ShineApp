# Plan Compacto: Agenda Operativa Unificada

Objetivo: hacer que `Agenda` sea la unica superficie diaria para reservas + ejecucion de ordenes, quitando la UI standalone de `Trabajos` sin fusionar dominios backend.

Arquitectura: mantener contratos Django/DRF existentes. Resolver `Reservation -> WorkOrder` en frontend, enriquecer cards de agenda y reutilizar modales/forms actuales de pago, consumo y detalle. Sin rutas nuevas ni state machine nueva.

Stack: Next.js App Router, React 19, TypeScript, CSS global en `frontend/app/globals.css`, helpers en `frontend/lib/`, API via `apiFetch`.

## Restricciones

- Checkout sin `.git`: no planear commit/branch/push.
- No agregar tooling de tests frontend.
- Preservar shell dark-first y layout de paneles.
- No cambiar modelos backend ni contratos API salvo bloqueo real.

## Archivos

- Crear `frontend/lib/agenda.ts`: helpers puros para unir reservas con ordenes.
- Modificar `frontend/app/page.tsx`: quitar `workorders` de nav, computar filas operativas, renderizar cards unificadas, acciones locales y modales.
- Modificar `frontend/app/globals.css`: estilos de card operativa, resumen, acciones y responsive.

## Tarea 1: Selectors De Agenda

Crear en `frontend/lib/agenda.ts`:

- `AnyRecord = Record<string, any>`
- `AgendaOperationalRow = { reservation: AnyRecord; workOrder: AnyRecord | null }`
- `buildWorkOrderByReservation(workOrders)`
- `buildAgendaOperationalRows(reservations, workOrders, weekDays, workOrderByReservationOverride?)`

Importar en `page.tsx`:

```ts
import {
  buildAgendaOperationalRows,
  buildWorkOrderByReservation,
} from '@/lib/agenda'
```

Calcular:

```ts
const workOrderByReservation = useMemo(
  () => buildWorkOrderByReservation(workOrders),
  [workOrders],
)

const agendaRowsByDay = useMemo(
  () =>
    buildAgendaOperationalRows(
      reservations,
      workOrders,
      weekDays,
      workOrderByReservation,
    ),
  [reservations, workOrders, weekDays, workOrderByReservation],
)
```

Reemplazar `reservationsByDay` por:

```ts
const dayRows = agendaRowsByDay[day] ?? []
```

Validar:

```powershell
cd frontend
npm run build
```

Esperado: `next build` OK, sin import roto `@/lib/agenda`, sin errores en `agendaRowsByDay` ni `workOrderByReservation`.

## Tarea 2: Quitar `Trabajos`

En `frontend/app/page.tsx`:

- Quitar `workorders` de `Section`.
- Quitar `workorders` de `sectionMeta`.
- Cambiar metadata de `agenda` a subtitle `Reservas, trabajos y operatoria diaria`.
- Borrar rama JSX `active === 'workorders'`.
- Mantener `createOrderFromReservation(reservation)` usando endpoint `POST /work-orders/from-reservation/`.

Validar:

```powershell
cd frontend
npm run build
```

Esperado: sin referencias JSX a `active === 'workorders'`; sidebar sin `Trabajos`.

## Tarea 3: Cards Operativas Unificadas

Agregar helpers en `page.tsx`:

- `renderAgendaWorkOrderSummary(workOrder)`
- `renderAgendaWorkOrderActions(workOrder)`

La card debe mapear:

```tsx
{dayRows.map(({ reservation, workOrder }) => (
  <div
    className={`record compact agenda-record ${workOrder ? 'has-work-order' : ''}`}
    key={reservation.id}
    {...detailRecordProps('Reserva', reservation)}
  >
    ...
    {workOrder ? renderAgendaWorkOrderSummary(workOrder) : null}
    {renderReservationActions(reservation, workOrder)}
    {workOrder ? renderAgendaWorkOrderActions(workOrder) : null}
  </div>
))}
```

Actualizar `renderReservationActions(item, workOrder?)`:

- `Confirmar` si `item.status === 'pending'`.
- `Crear orden` solo si no hay `workOrder` y status es `pending` o `confirmed`.
- `Cancelar` si status es `pending` o `confirmed`.
- Endpoints: `/reservations/${item.id}/confirm/`, `/reservations/${item.id}/cancel/`.

CSS minimo:

```css
.agenda-record { gap: 12px; }
.agenda-record.has-work-order { border-color: var(--shop-border-strong); }
.agenda-work-summary {
  display: grid;
  gap: 8px;
  padding: 12px;
  background: var(--shop-surface-raised);
  border: 1px solid var(--shop-border);
}
.agenda-work-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.agenda-work-actions { align-items: center; }
```

Validar:

```powershell
cd frontend
npm run build
```

## Tarea 4: Modales Contextuales

Agregar en `page.tsx`:

- `openPaymentForOrder(order)`
- `openWorkOrderDetail(order)`
- estado `const [payForOrder, setPayForOrder] = useState<AnyRecord | null>(null)`

`openPaymentForOrder` debe setear:

```ts
setPaymentForm({
  work_order: String(order.id),
  amount: '',
  payment_type: 'deposit',
  method: 'cash',
  notes: '',
})
setPayForOrder(order)
```

Renderizar modal `Registrar pago - Orden #${payForOrder.id}` con `savePayment`.

Actualizar `savePayment`:

- `POST /payments/`
- resetear `paymentForm`
- `setPayForOrder(null)`

Reutilizar:

```tsx
<button className="ghost" onClick={() => openConsumptionForOrder(workOrder)}>
  Consumir material
</button>
```

Validar:

```powershell
cd frontend
npm run build
```

Esperado: `savePayment` sigue funcionando para agenda y caja restante; `payForOrder`/`consumeForOrder` cierran al guardar.

## Tarea 5: Responsive Y Smoke

CSS responsive:

```css
@media (max-width: 980px) {
  .agenda-work-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .agenda-work-actions {
    flex-wrap: wrap;
  }
}

@media (max-width: 620px) {
  .agenda-record {
    padding: 12px;
  }

  .agenda-work-summary {
    padding: 10px;
  }
}
```

Build final:

```powershell
cd frontend
npm run build
```

Smoke manual:

1. Abrir `Agenda`.
2. Crear reserva.
3. Confirmarla.
4. Crear orden desde la misma card.
5. Cambiar estado desde la misma card.
6. Registrar pago desde la misma card.
7. Registrar consumo de material desde la misma card.
8. Abrir detalle y editar reserva/orden.
9. Confirmar que sidebar no expone `Trabajos`.

Docs follow-up: si cambia copy visible o comportamiento mas alla del plan, actualizar `docs/plans/2026-05-06-agenda-operativa-unificada-design.md`. Si coincide con el diseno aprobado, no hace falta doc extra.

## Self-Review

- Agenda unica: Tareas 2 y 3.
- Sin UI standalone `Trabajos`: Tarea 2.
- Crear/ver/editar/estado/pago/consumo desde agenda: Tareas 3 y 4.
- Separacion backend preservada: sin cambios backend.
- Compras/caja admin preservadas: acciones limitadas a agenda.
- Sin placeholders `TODO`, `TBD` ni "similar to previous task".
- Comandos concretos: `cd frontend`, `npm run build`.

## Handoff

Plan completo: `docs/plans/2026-05-06-agenda-operativa-unificada-implementation-plan.md`.

Opciones:

1. Subagent-Driven: subagente por tarea, review entre tareas.
2. Inline: ejecutar en esta sesion en orden, con checkpoints.
