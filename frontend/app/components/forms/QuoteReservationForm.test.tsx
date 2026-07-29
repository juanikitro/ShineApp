import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { QuoteReservationForm } from './QuoteReservationForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const props = {
		form: {
			vehicle: '1',
			day: '2026-07-22',
			start_time: '09:00',
			exit_time: '10:00',
		},
		onSubmit,
		onPatch,
		vehicleOptions: [{ value: '1', label: 'Ford' }],
		showVehicleSelect: true,
		useReservationTimes: true,
		submitting: false,
		...overrides,
	} as Parameters<typeof QuoteReservationForm>[0]

	return {
		...render(<QuoteReservationForm {...props} />),
		onSubmit,
		onPatch,
	}
}

test('QuoteReservationForm preserves optional vehicle, time fields, patches and submit', () => {
	const { container, onSubmit, onPatch } = renderForm()

	fireEvent.click(screen.getByRole('combobox', { name: 'Vehiculo' }))
	fireEvent.click(screen.getByRole('option', { name: 'Ford' }))
	fireEvent.change(screen.getByLabelText('Fecha de reserva'), {
		target: { value: '2026-07-23' },
	})
	fireEvent.change(screen.getByLabelText('Hora de ingreso'), {
		target: { value: '09:30' },
	})
	assert.deepEqual(onPatch.mock.calls, [
		[{ vehicle: '1' }],
		[{ day: '2026-07-23' }],
		[{ start_time: '09:30' }],
	])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('QuoteReservationForm hides fields absent for a quote vehicle or disabled times', () => {
	renderForm({ showVehicleSelect: false, useReservationTimes: false })

	assert.equal(screen.queryByRole('combobox', { name: 'Vehiculo' }), null)
	assert.equal(screen.queryByLabelText('Hora de ingreso'), null)
})
