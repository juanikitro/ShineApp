# Plan De Implementacion: Agenda Operativa Unificada

> **Para workers agenticos:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** Convertir `Agenda` en la unica superficie operativa diaria para reservas y ejecucion de ordenes de trabajo, eliminando la UI standalone de `Trabajos` sin mezclar dominios backend.

**Arquitectura:** Mantener los contratos backend existentes e implementar la unificacion en la superficie single-screen actual de Next.js. Resolver `Reservation -> WorkOrder` en el frontend, enriquecer cards de agenda con resumenes de orden de trabajo y reutilizar modales/forms existentes para pagos, consumos y edicion en vez de abrir una ruta o state machine nueva.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS global en `frontend/app/globals.css`, helpers frontend existentes en `frontend/lib/`, backend Django/DRF consumido mediante `apiFetch`.

---

## Restricciones

- El checkout actual no tiene `.git`; no agregar pasos de plan que requieran commit, branch o push.
- No agregar tooling de tests frontend en esta iteracion.
- Preservar la shell dark-first actual y el layout basado en paneles.
- No cambiar modelos backend ni contratos API salvo que la implementacion revele un bloqueo.

## Estructura De Archivos

### Archivos A Modificar

- `frontend/app/page.tsx`
  Responsabilidad: quitar `workorders` del flujo de navegacion, computar filas operativas de agenda, renderizar cards unificadas, cablear acciones locales de agenda y reutilizar modales existentes para pago/consumo/detalle.

- `frontend/app/globals.css`
  Responsabilidad: estilar cards unificadas de agenda, bloques de resumen de orden de trabajo, grupos de acciones contextuales y comportamiento responsive sin romper la grilla actual de agenda.

### Archivos A Crear

- `frontend/lib/agenda.ts`
  Responsabilidad: mantener helpers puros pequenos fuera de `page.tsx` para unir reservas con ordenes de trabajo y formatear filas operativas de agenda. No es una nueva capa de arquitectura; es un seam local de legibilidad.

## Tarea 1: Extraer Selectors Operativos De Agenda

**Archivos:**
- Crear: `frontend/lib/agenda.ts`
- Modificar: `frontend/app/page.tsx`
- Verificar: scripts de `frontend/package.json` mediante `npm run build`

- [ ] **Paso 1: Crear el archivo helper para composicion de agenda**

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

- [ ] **Paso 2: Importar el helper en `page.tsx` y reemplazar el reducer solo-reservas**

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

- [ ] **Paso 3: Reemplazar lecturas directas de `reservationsByDay` por `agendaRowsByDay` donde se renderizan cards de agenda**

```ts
const dayRows = agendaRowsByDay[day] ?? []
```

```ts
<small>{dayRows.length} turnos</small>
```

- [ ] **Paso 4: Correr el build frontend para detectar temprano errores de tipos/import**

Correr:

```powershell
cd frontend
npm run build
```

Esperado:

- `next build` completa correctamente.
- Sin import no resuelto para `@/lib/agenda`.
- Sin errores de tipo en `agendaRowsByDay` o `workOrderByReservation`.

## Tarea 2: Quitar La Seccion Standalone `Trabajos` Y Mover El Ancla De Flujo A `Agenda`

**Archivos:**
- Modificar: `frontend/app/page.tsx`
- Verificar: scripts de `frontend/package.json` mediante `npm run build`

- [ ] **Paso 1: Quitar `workorders` de la union `Section` y `sectionMeta`**

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

- [ ] **Paso 2: Borrar el bloque de render standalone `active === 'workorders'`**

```tsx
{active === 'workorders' ? (
  /* remove the entire block */
) : null}
```

- [ ] **Paso 3: Mantener helpers existentes de creacion de orden de trabajo, pero redirigir su entry point a cards de agenda**

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

- [ ] **Paso 4: Buildear y confirmar que el sidebar ya no referencia `Trabajos`**

Correr:

```powershell
cd frontend
npm run build
```

Esperado:

- No quedan ramas JSX que referencien `active === 'workorders'`.
- El sidebar renderiza solo las secciones restantes.

## Tarea 3: Reemplazar Cards Solo-Reserva Por Cards Operativas Unificadas

**Archivos:**
- Modificar: `frontend/app/page.tsx`
- Modificar: `frontend/app/globals.css`
- Verificar: scripts de `frontend/package.json` mediante `npm run build`

- [ ] **Paso 1: Agregar un render helper enfocado para el bloque de resumen de orden de trabajo**

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

- [ ] **Paso 2: Agregar un render helper enfocado para el cluster de acciones de orden de trabajo**

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

- [ ] **Paso 3: Reemplazar el mapping de cards de agenda por un render path `reservation + workOrder`**

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

- [ ] **Paso 4: Actualizar `renderReservationActions` para que no ofrezca `Crear orden` cuando la fila ya tiene una**

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

- [ ] **Paso 5: Agregar las clases CSS minimas para la card enriquecida**

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

- [ ] **Paso 6: Buildear despues de reemplazar la card**

Correr:

```powershell
cd frontend
npm run build
```

Esperado:

- Sin nombres de funcion duplicados.
- Sin errores JSX por las llamadas nuevas a helpers.
- La card enriquecida compila limpiamente.

## Tarea 4: Reutilizar Modales Contextuales Para Pagos Y Edicion Desde Agenda

**Archivos:**
- Modificar: `frontend/app/page.tsx`
- Verificar: scripts de `frontend/package.json` mediante `npm run build`

- [ ] **Paso 1: Agregar helpers locales de agenda para abrir modales, en vez de mandar al operador a otra seccion**

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

- [ ] **Paso 2: Agregar estado para el modal de pago junto al modal de consumo existente**

```ts
const [payForOrder, setPayForOrder] = useState<AnyRecord | null>(null)
```

- [ ] **Paso 3: Renderizar un modal de pago reutilizando el handler existente `savePayment`**

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

- [ ] **Paso 4: Cerrar el modal de pago despues de guardar exitosamente**

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

- [ ] **Paso 5: Reutilizar el opener existente del modal de consumo desde cards de agenda**

```tsx
<button className="ghost" onClick={() => openConsumptionForOrder(workOrder)}>
  Consumir material
</button>
```

- [ ] **Paso 6: Buildear despues del wiring de modales**

Correr:

```powershell
cd frontend
npm run build
```

Esperado:

- `savePayment` sigue compilando para el modal de agenda y cualquier superficie de caja restante.
- `payForOrder` y `consumeForOrder` cierran correctamente despues de guardar.

## Tarea 5: Polish Responsive Y Verificacion

**Archivos:**
- Modificar: `frontend/app/globals.css`
- Verificar: scripts de `frontend/package.json` mediante `npm run build`

- [ ] **Paso 1: Agregar guardas responsive para la card de agenda mas pesada**

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

- [ ] **Paso 2: Correr el build final**

Correr:

```powershell
cd frontend
npm run build
```

Esperado:

- El frontend tocado buildea correctamente con el CSS y JSX final.

- [ ] **Paso 3: Smoke manual del flujo operativo unificado**

Correr localmente mediante la app existente y verificar:

1. Abrir `Agenda`.
2. Crear una reserva.
3. Confirmarla.
4. Crear una orden de trabajo desde la misma card.
5. Cambiar su estado desde la misma card.
6. Registrar un pago desde la misma card.
7. Registrar un consumo de material desde la misma card.
8. Abrir detalle y editar reserva/orden.
9. Confirmar que el sidebar ya no expone `Trabajos`.

- [ ] **Paso 4: Decidir si docs necesitan nota follow-up**

Si la implementacion final cambia copy visible o comportamiento de pantalla mas alla de este plan, actualizar:

- `docs/plans/2026-05-06-agenda-operativa-unificada-design.md`

Si el comportamiento coincide exactamente con el diseno aprobado, no hace falta un doc extra.

## Self-Review

### Cobertura De Spec

- Agenda unica como entry point operativo: cubierto por Tareas 2 y 3.
- Quitar UI standalone de `Trabajos`: cubierto por Tarea 2.
- Soportar crear/ver/editar/estado/pago/consumo desde agenda: cubierto por Tareas 3 y 4.
- Preservar separacion backend: cubierto por la arquitectura y por evitar cambios backend.
- Preservar modulos existentes para compras/admin de caja: cubierto por restricciones y por limitar acciones locales de agenda.

### Scan De Placeholders

- No quedan placeholders `TODO`, `TBD` ni "similar to previous task".
- Todos los archivos cambiados estan nombrados explicitamente.
- Todos los comandos de verificacion son concretos y usan scripts actuales del repo.

### Consistencia De Tipos

- `AgendaOperationalRow`, `workOrderByReservation` y `agendaRowsByDay` usan los mismos nombres de reserva/orden de trabajo en todo el plan.
- `openPaymentForOrder`, `openConsumptionForOrder` y `openDetailModal` se alinean con naming existente en `page.tsx`.

## Handoff De Ejecucion

Plan guardado en `docs/plans/2026-05-06-agenda-operativa-unificada-implementation-plan.md`.

Dos opciones de ejecucion:

1. Subagent-Driven (recomendada): despachar un subagente fresco por tarea y revisar entre tareas.
2. Ejecucion Inline: ejecutar tareas en esta sesion en orden, con checkpoints de review.
