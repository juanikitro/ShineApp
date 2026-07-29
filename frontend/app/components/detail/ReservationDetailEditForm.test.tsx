import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { ReservationDetailEditForm } from './ReservationDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const onCustomerChange = vi.fn()
	const onVehicleChange = vi.fn()
	const onStatusChange = vi.fn()
	const focusHandler = vi.fn()
	const focusNextOnEnter = vi.fn((_: string, __?: boolean) => focusHandler)
	const props = {
		data: {
			customer: '1',
			vehicle: '2',
			day: '2026-07-22',
			exit_day: '2026-07-23',
			start_time: '09:30:00',
			exit_time: '11:30:00',
			status: 'scheduled',
			notes: 'Trae llave',
		},
		onSubmit,
		onPatch,
		customerOptions: [{ value: '1', label: 'Ana' }],
		vehicleOptions: [{ value: '2', label: 'Ford' }],
		statusOptions: [{ value: 'scheduled', label: 'Programada' }],
		onCustomerChange,
		onVehicleChange,
		onStatusChange,
		focusNextOnEnter,
		useReservationTimes: false,
		serviceLinesEditor: <div>Servicios</div>,
		workOrderSummary: <div>Trabajo vinculado</div>,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof ReservationDetailEditForm>[0]

	return {
		...render(<ReservationDetailEditForm {...props} />),
		onSubmit,
		onPatch,
		onCustomerChange,
		onVehicleChange,
		onStatusChange,
		focusNextOnEnter,
		focusHandler,
	}
}

test('ReservationDetailEditForm preserves controls, callbacks, focus flow and no-time variant', () => {
	const {
		container,
		onSubmit,
		onPatch,
		onVehicleChange,
		onStatusChange,
		focusNextOnEnter,
		focusHandler,
	} = renderForm()

	assert.ok(screen.getByText('Servicios'))
	assert.ok(screen.getByText('Trabajo vinculado'))
	assert.equal(screen.queryByLabelText('Hora de ingreso'), null)
	assert.deepEqual(focusNextOnEnter.mock.calls, [
		['detail.reservation.exit_day'],
		['detail.reservation.status', true],
	])
	fireEvent.change(screen.getByLabelText('Notas'), {
		target: { value: 'Deja llave' },
	})
	fireEvent.keyDown(screen.getByLabelText('Fecha de ingreso'), { key: 'Enter' })
	fireEvent.click(screen.getByRole('combobox', { name: 'Vehiculo' }))
	fireEvent.click(screen.getByRole('option', { name: 'Ford' }))
	fireEvent.click(screen.getByRole('combobox', { name: 'Estado' }))
	fireEvent.click(screen.getByRole('option', { name: 'Programada' }))
	assert.deepEqual(onPatch.mock.calls, [[{ notes: 'Deja llave' }]])
	assert.equal(focusHandler.mock.calls.length, 1)
	assert.deepEqual(onVehicleChange.mock.calls, [['2']])
	assert.deepEqual(onStatusChange.mock.calls, [['scheduled']])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('ReservationDetailEditForm preserves time fields and their focus progression', () => {
	const { focusNextOnEnter } = renderForm({ useReservationTimes: true })

	assert.equal(screen.getByLabelText('Hora de ingreso').getAttribute('type'), 'time')
	assert.equal(screen.getByLabelText('Hora de egreso').getAttribute('type'), 'time')
	assert.deepEqual(focusNextOnEnter.mock.calls, [
		['detail.reservation.exit_day'],
		['detail.reservation.start_time', false],
		['detail.reservation.exit_time'],
		['detail.reservation.status', true],
	])
})
