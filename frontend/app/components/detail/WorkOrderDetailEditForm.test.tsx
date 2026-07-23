import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { WorkOrderDetailEditForm } from './WorkOrderDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const onCustomerChange = vi.fn()
	const onVehicleChange = vi.fn()
	const onServiceChange = vi.fn()
	const onStatusChange = vi.fn()
	const focusHandler = vi.fn()
	const focusNextOnEnter = vi.fn((_: string, __?: boolean) => focusHandler)
	const props = {
		data: {
			customer: '1',
			vehicle: '2',
			service: '3',
			status: 'in_progress',
			total_amount: '8000',
			estimated_delivery_at: '2026-07-22T15:30:00',
			internal_notes: 'No llamar',
		},
		onSubmit,
		onPatch,
		customerOptions: [{ value: '1', label: 'Ana' }],
		vehicleOptions: [{ value: '2', label: 'Ford' }],
		serviceOptions: [{ value: '3', label: 'Lavado' }],
		statusOptions: [{ value: 'in_progress', label: 'En proceso' }],
		onCustomerChange,
		onVehicleChange,
		onServiceChange,
		onStatusChange,
		focusNextOnEnter,
		canViewEconomy: true,
		consumptionAction: <div>Consumir material</div>,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof WorkOrderDetailEditForm>[0]

	return {
		...render(<WorkOrderDetailEditForm {...props} />),
		onSubmit,
		onPatch,
		onServiceChange,
		onStatusChange,
		focusNextOnEnter,
		focusHandler,
	}
}

test('WorkOrderDetailEditForm preserves economic fields, callbacks, focus and actions', () => {
	const {
		container,
		onSubmit,
		onPatch,
		onServiceChange,
		onStatusChange,
		focusNextOnEnter,
		focusHandler,
	} = renderForm()

	assert.ok(screen.getByText('Consumir material'))
	assert.equal(screen.getByLabelText('Total').getAttribute('min'), '0')
	assert.deepEqual(focusNextOnEnter.mock.calls, [
		['detail.workorder.estimated_delivery_at'],
		['detail.workorder.internal_notes'],
	])
	fireEvent.change(screen.getByLabelText('Notas internas'), {
		target: { value: 'Avisar al llegar' },
	})
	fireEvent.keyDown(screen.getByLabelText('Total'), { key: 'Enter' })
	fireEvent.click(screen.getByRole('combobox', { name: 'Servicio' }))
	fireEvent.click(screen.getByRole('option', { name: 'Lavado' }))
	fireEvent.click(screen.getByRole('combobox', { name: 'Estado' }))
	fireEvent.click(screen.getByRole('option', { name: 'En proceso' }))
	assert.deepEqual(onPatch.mock.calls, [[{ internal_notes: 'Avisar al llegar' }]])
	assert.equal(focusHandler.mock.calls.length, 1)
	assert.deepEqual(onServiceChange.mock.calls, [['3']])
	assert.deepEqual(onStatusChange.mock.calls, [['in_progress']])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('WorkOrderDetailEditForm hides economic total and keeps delivery focus without access', () => {
	const { focusNextOnEnter } = renderForm({ canViewEconomy: false })

	assert.equal(screen.queryByLabelText('Total'), null)
	assert.deepEqual(focusNextOnEnter.mock.calls, [
		['detail.workorder.internal_notes'],
	])
})
