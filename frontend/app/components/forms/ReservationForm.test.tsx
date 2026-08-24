import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { ReservationForm } from './ReservationForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const props = {
		submitLabel: 'Crear reserva',
		onSubmit,
		prefillDayMode: false,
		reservationForm: {
			customer: '',
			vehicle: '',
			items: [],
			day: '2026-08-23',
			exit_day: '',
			start_time: '',
			exit_time: '',
			notes: '',
		},
		setReservationForm: vi.fn(),
		customerOptions: [],
		customerVehicleOptions: [],
		serviceOptions: [],
		canViewEconomy: true,
		useReservationTimes: false,
		allowOverlap: false,
		enforceCapacity: false,
		sectors: [],
		services: [],
		vehicles: [],
		reservations: [],
		openQuickCreate: vi.fn(),
		updateReservationCustomer: vi.fn(),
		updateReservationVehicle: vi.fn(),
		addReservationItem: vi.fn(),
		selectReservationService: vi.fn(),
		updateReservationItem: vi.fn(),
		removeReservationItem: vi.fn(),
		focusField: vi.fn(),
		focusNextOnEnter: vi.fn(() => vi.fn()),
		flashClass: vi.fn(() => ''),
		fieldFlashKey: vi.fn((target) => target),
		...overrides,
	} as Parameters<typeof ReservationForm>[0]

	return render(<ReservationForm {...props} />)
}

test('ReservationForm permits saving a reservation on a past date', () => {
	renderForm()

	const day = screen.getByLabelText('Fecha de ingreso (opcional)')
	const submit = screen.getByRole('button', { name: 'Crear reserva' })

	assert.equal(day.getAttribute('min'), null)
	assert.equal(submit.hasAttribute('disabled'), false)
	assert.equal(screen.queryByText(/La fecha elegida ya paso/), null)
	assert.ok(screen.getByText('Sin límite de cupos'))
})
