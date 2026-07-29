import assert from 'node:assert/strict'
import { type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	form: null as Record<string, any> | null,
	serviceLines: null as Record<string, any> | null,
	workOrderSummary: null as Record<string, any> | null,
}))

vi.mock('./ReservationDetailEditForm', () => ({
	ReservationDetailEditForm: (props: Record<string, any>) => {
		capturedProps.form = props
		return (
			<>
				<span>Editor de reserva</span>
				{props.serviceLinesEditor}
				{props.workOrderSummary}
				{props.actions}
			</>
		)
	},
}))

vi.mock('./ReservationServiceLinesEditor', () => ({
	ReservationServiceLinesEditor: (props: Record<string, any>) => {
		capturedProps.serviceLines = props
		return <span>Lineas de servicio</span>
	},
}))

vi.mock('@/app/components/agenda/AgendaWorkOrderSummary', () => ({
	AgendaWorkOrderSummary: (props: Record<string, any>) => {
		capturedProps.workOrderSummary = props
		return <span>Resumen de trabajo</span>
	},
}))

import { renderReservationDetailEditor } from './reservation-detail-edit-renderer'

afterEach(cleanup)

function renderReservation(
	overrides: Record<string, unknown> = {},
	options: { canViewEconomy?: boolean } = {},
) {
	const onPatch = vi.fn()
	const onUpdateCustomer = vi.fn()
	const onFocusField = vi.fn()
	const onOpenDetail = vi.fn()
	const onCreateQuote = vi.fn()
	const renderActions = vi.fn((beforeSubmit: ReactNode | undefined) => (
		<>{beforeSubmit}</>
	))
	const data = {
		id: 'reservation-edit',
		status: 'confirmed',
		customer: '1',
		vehicle: '2',
		work_order: { id: 'work-1', status: 'in_progress' },
		...overrides,
	}
	const originalData = { id: 'reservation-original' }
	const reservationItems = vi.fn(() => [{ service: '1', quantity: '1' }])
	const onAddService = vi.fn()
	const onSelectService = vi.fn()
	const onUpdateService = vi.fn()
	const onRemoveService = vi.fn()

	return {
		...render(
			renderReservationDetailEditor({
				data,
				originalData,
				onSubmit: () => {},
				onPatch,
				customerOptions: [{ value: '1', label: 'Ana' }],
				vehicleOptions: [{ value: '2', label: 'Ford' }],
				reservationLabels: { confirmed: 'Confirmada' },
				onUpdateCustomer,
				onFocusField,
				focusNextOnEnter: () => () => {},
				useReservationTimes: true,
				reservationItems,
				serviceOptions: [{ value: '1', label: 'Lavado' }],
				onAddService,
				onSelectService,
				onUpdateService,
				onRemoveService,
				canViewEconomy: options.canViewEconomy ?? true,
				orderLabels: { in_progress: 'En proceso' },
				onOpenDetail,
				onCreateQuote,
				renderActions,
			}),
		),
		data,
		originalData,
		onPatch,
		onUpdateCustomer,
		onFocusField,
		onOpenDetail,
		onCreateQuote,
		renderActions,
		reservationItems,
		onAddService,
		onSelectService,
		onUpdateService,
		onRemoveService,
	}
}

test('reservation detail renderer preserves callbacks, lines, work summary and original quote source', () => {
	capturedProps.workOrderSummary = null
	const {
		data,
		originalData,
		onPatch,
		onUpdateCustomer,
		onFocusField,
		onOpenDetail,
		onCreateQuote,
		renderActions,
		reservationItems,
		onAddService,
		onSelectService,
		onUpdateService,
		onRemoveService,
	} = renderReservation()

	assert.ok(screen.getByText('Editor de reserva'))
	assert.ok(screen.getByText('Lineas de servicio'))
	assert.ok(screen.getByText('Resumen de trabajo'))
	assert.equal(renderActions.mock.calls.length, 1)
	assert.deepEqual(reservationItems.mock.calls, [[data]])
	assert.equal(capturedProps.serviceLines?.onAdd, onAddService)
	assert.equal(capturedProps.serviceLines?.onSelectService, onSelectService)
	assert.equal(capturedProps.serviceLines?.onUpdate, onUpdateService)
	assert.equal(capturedProps.serviceLines?.onRemove, onRemoveService)
	capturedProps.form?.onCustomerChange('3')
	capturedProps.form?.onVehicleChange('4')
	capturedProps.form?.onStatusChange('canceled')
	const workOrderSummary = capturedProps.workOrderSummary as Record<string, any> | null
	assert.ok(workOrderSummary)
	workOrderSummary.onOpenDetail({ id: 'work-2' })
	fireEvent.click(screen.getByRole('button', { name: 'Crear cotizacion' }))

	assert.deepEqual(onUpdateCustomer.mock.calls, [['reservation', '3']])
	assert.deepEqual(onPatch.mock.calls, [
		[{ vehicle: '4' }],
		[{ status: 'canceled' }],
	])
	assert.deepEqual(onFocusField.mock.calls, [
		['detail.reservation.service.0', true],
		['detail.reservation.notes'],
	])
	assert.deepEqual(onOpenDetail.mock.calls, [
		['Orden de trabajo', { id: 'work-2' }],
	])
	assert.deepEqual(onCreateQuote.mock.calls, [[originalData]])
})

test('reservation detail renderer omits unavailable work summary and quote action', () => {
	capturedProps.workOrderSummary = null
	const { renderActions } = renderReservation(
		{
			status: 'pending',
			work_order: { id: 'work-1' },
		},
		{ canViewEconomy: false },
	)

	assert.equal(capturedProps.form?.workOrderSummary, null)
	assert.equal(capturedProps.workOrderSummary, null)
	assert.equal(renderActions.mock.calls[0]?.[0], null)
	assert.equal(screen.queryByRole('button', { name: 'Crear cotizacion' }), null)
})
