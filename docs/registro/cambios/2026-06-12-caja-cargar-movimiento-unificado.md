# Caja: boton unico "Cargar movimiento" con toggle por tipo

## Cambio

En el panel de caja (`displayedActive === 'cash'`) los tres botones que dispararban modales separados se unifican en un solo boton **"Cargar movimiento"**. El modal que se abre por defecto sigue siendo el de "Ingreso / egreso" (form de movimiento manual), pero ahora arranca con un toggle arriba para cambiar el tipo de carga sin cerrar el modal.

Antes (toolbar de caja):

- `Cobrar trabajo` (primary) -> abria `payment` modal.
- `Ingreso / egreso` (ghost) -> abria `cash-movement` modal.
- `Pagar deuda` (ghost) -> abria `debt-payment` modal.

Ahora:

- `Cargar movimiento` (primary) -> abre `cash-load` modal.
- Dentro del modal, un `SegmentedControl` con `selectionMode="tabs"` permite elegir entre:
  - `Movimiento normal` (default, renderiza `CashMovementForm`).
  - `Pagar deuda` (renderiza `DebtPaymentForm`).
  - `Cobrar trabajo` (renderiza `PaymentForm`).

El cambio de tab dispara el focus inicial del primer campo del form correspondiente. Al guardar, los handlers existentes (`saveCashMovement`, `saveDebtPayment`, `savePayment`) cierran el modal via `formModalExit.close()`.

Los modales individuales (`cash-movement`, `payment`, `debt-payment`) siguen existiendo para invocaciones contextuales que no parten del toolbar de caja (por ejemplo `openDebtPaymentForDebt` desde el panel de deudas, `openAdjustmentForClosedDay` para ajustes de cierre, o `onCreateDebtPayment` desde `DebtPanel`). Esos flujos no muestran el toggle.

## Frontend

- `frontend/app/components/cash/CashPanel.tsx`:
  - Reemplaza los tres botones del rail por uno solo (`primary`, icono `Plus`, label "Cargar movimiento") que dispara `onCreateMovement`.
  - Quita las props `onCollectWork` y `onPayDebt` del contrato del panel (ya no se usan).
  - El boton del `Empty` state cuando no hay movimientos del dia tambien se cambia a "Cargar movimiento".
- `frontend/lib/page-support.tsx`:
  - Agrega `'cash-load'` a `FormModalKind`.
- `frontend/app/page.tsx`:
  - Nuevo estado local `cashLoadTab` (`'cash-movement' | 'payment' | 'debt-payment'`), inicial `'cash-movement'`.
  - Constante `cashLoadTabOptions` con el orden y labels del toggle (Movimiento normal, Pagar deuda, Cobrar trabajo).
  - `openFormModal('cash-load')`: resetea los tres forms (movement, payment, debt-payment) y vuelve el tab a `'cash-movement'`.
  - `firstFocus['cash-load'] = 'cash-movement.type'` (foco inicial del modal recien abierto).
  - El JSX del modal `cash-load` renderiza el `SegmentedControl` + el form correspondiente al tab; el `onChange` del toggle hace focus al primer campo del nuevo form.
  - El render del `CashPanel` deja de pasar `onCollectWork`/`onPayDebt` y apunta `onCreateMovement` a `openFormModal('cash-load')`.
- `frontend/app/styles/shell.css`:
  - Nuevas reglas para `.cash-load-modal` (`display: grid; gap: var(--space-3)`) y `.cash-load-toggle` (ancho completo + alto de boton consistente con el resto del SegmentedControl).

## Contexto

El rail de la caja tenia tres acciones primarias muy ruidosas para una tarea conceptualmente unica ("cargar un movimiento de caja"). Unificar la entrada al modal y dejar la eleccion del tipo dentro reduce ruido visual y elimina la decision a nivel de barra de herramientas. El patron del toggle replica el `SegmentedControl` ya usado en agenda para elegir sector (`agenda-type-toggle`), asi que la UX queda consistente con otras secciones.

## Validacion

- Typecheck: `npx tsc --noEmit` en `frontend/` sin errores.
- Tests: `npx vitest run` en `frontend/` -> 50 archivos, 427 tests en verde.
