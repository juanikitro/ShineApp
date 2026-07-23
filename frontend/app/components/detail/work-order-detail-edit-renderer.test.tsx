import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	form: null as Record<string, any> | null,
}))

vi.mock('./WorkOrderDetailEditForm', () => ({
	WorkOrderDetailEditForm: (props: Record<string, any>) => {
		capturedProps.form = props
		return (
			<>
				<span>Editor de orden</span>
				{props.consumptionAction}
				{props.actions}
			</>
		)
	},
}))

import { renderWorkOrderDetailEditor } from './work-order-detail-edit-renderer'

afterEach(cleanup)

function renderWorkOrder(options: { canViewEconomy?: boolean; id?: string } = {}) {
	const onPatch = vi.fn()
	const onUpdateCustomer = vi.fn()
	const onFocusField = vi.fn()
	const onOpenConsumption = vi.fn()
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)
	const data = { service: '1', total_amount: '900' }
	const originalData = {
		id: options.id ?? 'work-original',
		_agenda_day: '2026-07-22',
	}

	return {
		...render(
			renderWorkOrderDetailEditor({
				data,
				originalData,
				onSubmit: () => {},
				onPatch,
				customerOptions: [{ value: '1', label: 'Ana' }],
				vehicleOptions: [{ value: '2', label: 'Ford' }],
				serviceOptions: [{ value: '2', label: 'Detailing' }],
				orderLabels: { in_progress: 'En proceso' },
				onUpdateCustomer,
				onFocusField,
				focusNextOnEnter: () => () => {},
				canViewEconomy: options.canViewEconomy ?? true,
				services: [{ id: 2, base_price: '2500' }],
				selectedDay: '2026-07-23',
				onOpenConsumption,
				renderActions,
			}),
		),
		originalData,
		onPatch,
		onUpdateCustomer,
		onFocusField,
		onOpenConsumption,
		renderActions,
	}
}

test('work order detail renderer preserves callbacks and original-data material consumption', () => {
	const {
		originalData,
		onPatch,
		onUpdateCustomer,
		onFocusField,
		onOpenConsumption,
		renderActions,
	} = renderWorkOrder()

	assert.ok(screen.getByText('Editor de orden'))
	assert.equal(renderActions.mock.calls.length, 1)
	capturedProps.form?.onCustomerChange('3')
	capturedProps.form?.onVehicleChange('4')
	capturedProps.form?.onServiceChange('2')
	capturedProps.form?.onStatusChange('in_progress')
	fireEvent.click(screen.getByRole('button', { name: 'Consumir material' }))

	assert.deepEqual(onUpdateCustomer.mock.calls, [['workorder', '3']])
	assert.deepEqual(onPatch.mock.calls, [
		[{ vehicle: '4' }],
		[{ service: '2', total_amount: '2500' }],
		[{ status: 'in_progress' }],
	])
	assert.deepEqual(onFocusField.mock.calls, [
		['detail.workorder.service', true],
		['detail.workorder.status', true],
		['detail.workorder.total_amount'],
	])
	assert.deepEqual(onOpenConsumption.mock.calls, [
		[originalData, '2026-07-22'],
	])
})

test('work order detail renderer hides economy-only consumption and uses the delivery focus', () => {
	const { onFocusField } = renderWorkOrder({ canViewEconomy: false, id: '' })

	assert.equal(capturedProps.form?.consumptionAction, null)
	capturedProps.form?.onStatusChange('in_progress')
	assert.equal(
		capturedProps.form?.canViewEconomy,
		false,
	)
	assert.equal(
		(screen.queryByRole('button', { name: 'Consumir material' })),
		null,
	)
	assert.deepEqual(onFocusField.mock.calls, [
		['detail.workorder.estimated_delivery_at'],
	])
})
