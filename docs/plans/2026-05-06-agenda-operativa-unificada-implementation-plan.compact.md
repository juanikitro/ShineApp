# Agenda Operativa Unificada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `Agenda` into the only daily operational surface for reservations and work-order execution, removing the standalone `Trabajos` UI without merging backend domains.

**Architecture:** Keep the existing backend contracts and implement the unification in the current Next.js single-screen surface. Resolve `Reservation -> WorkOrder` in the frontend, enrich agenda cards with work-order summaries, and reuse existing modals/forms for payment, consumption, and editing instead of opening a new route or state machine.

**Tech Stack:** Next.js App Router, React 19, TypeScript, global CSS in `frontend/app/globals.css`, existing frontend helpers in `frontend/lib/`, Django/DRF backend consumed via `apiFetch`.

---

## Constraints

- The current checkout has no `.git`; do not add plan steps that require commit, branch, or push.
- Do not add frontend test tooling this iteration.
- Preserve dark-first shell and panel layout.
- Do not change backend models or API contracts unless blocker appears.

## File Structure

### Files to modify

- `frontend/app/page.tsx`
  Responsibility: remove `workorders` from the navigation flow, compute agenda operational rows, render unified cards, wire agenda-local actions, and reuse existing modals for payment/consumption/detail.

- `frontend/app/globals.css`
  Style unified agenda cards, work-order summary, contextual action groups, responsive behavior. Do not break existing agenda grid.

### Files to create

- `frontend/lib/agenda.ts`
  Responsibility: keep small pure helpers out of `page.tsx` for joining reservations to work orders and formatting agenda operational rows. This is not a new architecture layer; it is a local readability seam.

## Task 1: Extract agenda operational selectors

**Files:**
- Create: `frontend/lib/agenda.ts`
- Modify: `frontend/app/page.tsx`
- Verify: `frontend/package.json` scripts via `npm run build`

- [ ] **Step 1: Create helper file for agenda composition**

```ts
export type AnyRecord = Record<string, any>

export type AgendaOperationalRow = {
  reservation: AnyRecord
  workOrder: AnyRecord | null
}

export function buildWorkOrderByReservation(
  workOrders: AnyRecord[],
): Record<string, AnyRecord> {
  return workOrders.reduce<Record<string, AnyRecord>>((acc, workOrder) => {
    if (workOrder.reservation !== null && workOrder.reservation !== undefined) {
      acc[String(workOrder.reservation)] = workOrder
    }
    return acc
  }, {})
}

export function buildAgendaOperationalRows(
  reservations: AnyRecord[],
  workOrders: AnyRecord[],
  weekDays: string[],
  workOrderByReservationOverride?: Record<string, AnyRecord>,
): Record<string, AgendaOperationalRow[]> {
  const workOrderByReservation =
    workOrderByReservationOverride ?? buildWorkOrderByReservation(workOrders)
  return reservations.reduce<Record<string, AgendaOperationalRow[]>>(
    (groups, reservation) => {
      if (!weekDays.includes(reservation.day)) return groups
      const key = reservation.day
      const row = {
        reservation,
        workOrder: workOrderByReservation[String(reservation.id)] ?? null,
      }
      const dayRows = groups[key] ?? (groups[key] = [])
      dayRows.push(row)
      return groups
    },
    {},
  )
}
```

- [ ] **Step 2: Import the helper into `page.tsx` and replace the reservation-only reducer**

```ts
import {
  buildAgendaOperationalRows,
  buildWorkOrderByReservation,
} from '@/lib/agenda'
```

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

- [ ] **Step 3: Replace direct `reservationsByDay` reads with `agendaRowsByDay` where agenda cards are rendered**

```ts
const dayRows = agendaRowsByDay[day] ?? []
```

```ts
<small>{dayRows.length} turnos</small>
```

- [ ] **Step 4: Build early for type/import mistakes**

Run:

```powershell
cd frontend
npm run build
```

Expected:

- `next build` completes successfully.
- No unresolved import for `@/lib/agenda`.
- No type errors on `agendaRowsByDay` or `workOrderByReservation`.

## Task 2: Remove the standalone `Trabajos` section and move the flow anchor into `Agenda`

**Files:**
- Modify: `frontend/app/page.tsx`
- Verify: `frontend/package.json` scripts via `npm run build`

- [ ] **Step 1: Remove `workorders` from the `Section` union and `sectionMeta`**

```ts
type Section =
  | 'dashboard'
  | 'agenda'
  | 'customers'
  | 'vehicles'
  | 'cash'
  | 'inventory'
  | 'quotes'
  | 'services'
```

```ts
agenda: {
  label: 'Agenda',
  icon: CalendarDays,
  subtitle: 'Reservas, trabajos y operatoria diaria',
},
```

- [ ] **Step 2: Delete the standalone `active === 'workorders'` render block**

```tsx
{active === 'workorders' ? (
  /* remove the entire block */
) : null}
```

- [ ] **Step 3: Keep work-order creation helpers; entry point becomes agenda cards**

```ts
function createOrderFromReservation(reservation: AnyRecord) {
  return runAction(() =>
    apiFetch('/work-orders/from-reservation/', {
      method: 'POST',
      body: JSON.stringify({ reservation: reservation.id }),
    }),
  )
}
```

- [ ] **Step 4: Build and confirm the sidebar no longer references `Trabajos`**

Run:

```powershell
cd frontend
npm run build
```

Expected:

- No JSX branch references `active === 'workorders'`.
- Sidebar renders only the remaining sections.

## Task 3: Replace reservation-only agenda cards with unified operational cards

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/globals.css`
- Verify: `frontend/package.json` scripts via `npm run build`

- [ ] **Step 1: Add focused work-order summary render helper**

```ts
function renderAgendaWorkOrderSummary(workOrder: AnyRecord) {
  return (
    <div className="agenda-work-summary">
      <div className="agenda-work-meta">
        <strong>Orden #{workOrder.id}</strong>
        <StatusPill value={workOrder.status} labels={orderLabels} />
      </div>
      <div className="record-sub">
        Total <span className="money">{money(workOrder.total_amount)}</span>
        {' · '}Pagado <span className="money">{money(workOrder.paid_amount)}</span>
        {' · '}Deuda{' '}
        <span className={Number(workOrder.balance_due) > 0 ? 'debt' : 'money'}>
          {money(workOrder.balance_due)}
        </span>
      </div>
      <div className="record-sub">
        Materiales <span className="money">{money(workOrder.material_cost)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add focused work-order action cluster render helper**

```ts
function renderAgendaWorkOrderActions(workOrder: AnyRecord) {
  return (
    <div className="record-actions agenda-work-actions">
      <button className="primary" onClick={() => openPaymentForOrder(workOrder)}>
        Cobrar
      </button>
      <button className="ghost" onClick={() => openConsumptionForOrder(workOrder)}>
        Consumir material
      </button>
      {Object.entries(orderLabels).map(([key, label]) => (
        <button
          key={key}
          className="ghost"
          onClick={() =>
            runAction(() =>
              apiFetch(`/work-orders/${workOrder.id}/status/`, {
                method: 'POST',
                body: JSON.stringify({ status: key }),
              }),
            )
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Replace the agenda card mapping with a `reservation + workOrder` render path**

```tsx
{dayRows.map(({ reservation, workOrder }) => (
  <div
    className={`record compact agenda-record ${workOrder ? 'has-work-order' : ''}`}
    key={reservation.id}
    {...detailRecordProps('Reserva', reservation)}
  >
    <div className="record-head">
      <div>
        <div className="record-title">
          {reservation.start_time?.slice(0, 5) || 'Sin hora'} - {reservation.customer_name}
        </div>
        <div className="record-sub">{reservation.service_name}</div>
      </div>
      <StatusPill value={reservation.status} labels={reservationLabels} />
    </div>

    {workOrder ? renderAgendaWorkOrderSummary(workOrder) : null}

    {renderReservationActions(reservation, workOrder)}

    {workOrder ? renderAgendaWorkOrderActions(workOrder) : null}
  </div>
))}
```

- [ ] **Step 4: Update `renderReservationActions` so it does not offer `Crear orden` when the row already has one**

```ts
function renderReservationActions(item: AnyRecord, workOrder?: AnyRecord | null) {
  return (
    <div className="record-actions">
      {item.status === 'pending' ? (
        <button className="ghost" onClick={() => runAction(() => apiFetch(`/reservations/${item.id}/confirm/`, { method: 'POST' }))}>
          Confirmar
        </button>
      ) : null}
      {!workOrder && ['pending', 'confirmed'].includes(item.status) ? (
        <button className="ghost" onClick={() => createOrderFromReservation(item)}>
          Crear orden
        </button>
      ) : null}
      {['pending', 'confirmed'].includes(item.status) ? (
        <button className="danger" onClick={() => runAction(() => apiFetch(`/reservations/${item.id}/cancel/`, { method: 'POST' }))}>
          Cancelar
        </button>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Add minimum CSS classes for richer card**

```css
.agenda-record {
  gap: 12px;
}

.agenda-record.has-work-order {
  border-color: var(--shop-border-strong);
}

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

.agenda-work-actions {
  align-items: center;
}
```

- [ ] **Step 6: Build after card replacement**

Run:

```powershell
cd frontend
npm run build
```

Expected:

- No duplicate function names.
- No JSX errors from helper calls.
- Richer card compiles.

## Task 4: Reuse contextual modals for payment and edit flows from agenda

**Files:**
- Modify: `frontend/app/page.tsx`
- Verify: `frontend/package.json` scripts via `npm run build`

- [ ] **Step 1: Add agenda-local openers; do not send operator to another section**

```ts
function openPaymentForOrder(order: AnyRecord) {
  setPaymentForm({
    work_order: String(order.id),
    amount: '',
    payment_type: 'deposit',
    method: 'cash',
    notes: '',
  })
  setPayForOrder(order)
}

function openWorkOrderDetail(order: AnyRecord) {
  openDetailModal('Orden de trabajo', order)
}
```

- [ ] **Step 2: Add payment modal state beside existing consumption modal**

```ts
const [payForOrder, setPayForOrder] = useState<AnyRecord | null>(null)
```

- [ ] **Step 3: Render a payment modal reusing the existing `savePayment` handler**

```tsx
{payForOrder ? (
  <Modal
    title={`Registrar pago - Orden #${payForOrder.id}`}
    onClose={() => setPayForOrder(null)}
  >
    <form className="form-grid" onSubmit={savePayment}>
      <div className="info-note">
        {payForOrder.customer_name} - {payForOrder.vehicle_label} - deuda {money(payForOrder.balance_due)}
      </div>
      <Field label="Importe">
        <input
          required
          type="number"
          min="0"
          value={paymentForm.amount}
          onChange={(event) =>
            setPaymentForm({ ...paymentForm, amount: event.target.value })
          }
        />
      </Field>
      <button className="primary">Registrar pago</button>
    </form>
  </Modal>
) : null}
```

- [ ] **Step 4: Close payment modal after successful save**

```ts
async function savePayment(event: FormEvent) {
  event.preventDefault()
  await runAction(async () => {
    await apiFetch('/payments/', {
      method: 'POST',
      body: JSON.stringify(paymentForm),
    })
    setPaymentForm({
      work_order: '',
      amount: '',
      payment_type: 'deposit',
      method: 'cash',
      notes: '',
    })
    setPayForOrder(null)
  })
}
```

- [ ] **Step 5: Reuse existing consumption modal opener from agenda cards**

```tsx
<button className="ghost" onClick={() => openConsumptionForOrder(workOrder)}>
  Consumir material
</button>
```

- [ ] **Step 6: Build after modal wiring**

Run:

```powershell
cd frontend
npm run build
```

Expected:

- `savePayment` still compiles for both the agenda modal and any remaining cash surface.
- `payForOrder` and `consumeForOrder` close cleanly after save.

## Task 5: Responsive polish and verification

**Files:**
- Modify: `frontend/app/globals.css`
- Verify: `frontend/package.json` scripts via `npm run build`

- [ ] **Step 1: Add responsive guards for heavier agenda card**

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

- [ ] **Step 2: Run final build**

Run:

```powershell
cd frontend
npm run build
```

Expected:

- Touched frontend builds successfully with final CSS and JSX.

- [ ] **Step 3: Manual smoke test unified operator flow**

Run existing app. Verify:

1. Open `Agenda`.
2. Create a reservation.
3. Confirm it.
4. Create a work order from the same card.
5. Change its status from the same card.
6. Register a payment from the same card.
7. Register a material consumption from the same card.
8. Open detail and edit reservation/order.
9. Confirm the sidebar no longer exposes `Trabajos`.

- [ ] **Step 4: Decide whether docs need follow-up note**

If implementation changes visible copy or screen behavior beyond plan, update:

- `docs/plans/2026-05-06-agenda-operativa-unificada-design.md`

If behavior matches approved design exactly, no extra doc file.

## Self-review

### Spec coverage

- Single agenda operational entry point: Tasks 2, 3.
- Remove standalone `Trabajos` UI: Task 2.
- Support create/view/edit/status/payment/consumption from agenda: covered by Tasks 3 and 4.
- Preserve backend separation: architecture + no backend changes.
- Preserve purchases/cash admin modules: constraints + agenda-local scope.

### Placeholder scan

- No `TODO`, `TBD`, or "similar to previous task" placeholders remain.
- All changed files named.
- All verification commands concrete, current repo scripts.

### Type consistency

- `AgendaOperationalRow`, `workOrderByReservation`, and `agendaRowsByDay` use the same reservation/work-order names throughout.
- `openPaymentForOrder`, `openConsumptionForOrder`, and `openDetailModal` align with existing naming in `page.tsx`.

## Execution handoff

Plan saved to `docs/plans/2026-05-06-agenda-operativa-unificada-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (recommended) - fresh subagent per task, review between tasks.
2. Inline Execution - execute tasks in order, with review checkpoints.
