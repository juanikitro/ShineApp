import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CustomerUpcomingReservationsPanel } from './CustomerUpcomingReservationsPanel'

afterEach(cleanup)

test('CustomerUpcomingReservationsPanel preserves reservation rows and opens the complete record', () => {
	const row = {
		id: 7,
		services: 'Lavado',
		vehicle: 'Fiesta',
		day: '2026-07-22',
		status: 'pending',
	}
	const fullRecord = { ...row, notes: 'Registro completo' }
	const opened = [] as unknown[]
	render(
		<CustomerUpcomingReservationsPanel
			reservationRows={[row]}
			reservations={[fullRecord]}
			reservationLabels={{ pending: 'Pendiente' }}
			useReservationTimes={false}
			onOpenReservation={(reservation) => opened.push(reservation)}
		/>,
	)

	fireEvent.click(screen.getByRole('button', { name: /Lavado - Fiesta/ }))

	assert.ok(screen.getByText('1 reservas futuras visibles'))
	assert.ok(screen.getByText('Pendiente'))
	assert.deepEqual(opened, [fullRecord])
})

test('CustomerUpcomingReservationsPanel preserves its empty state', () => {
	render(
		<CustomerUpcomingReservationsPanel
			reservationRows={[]}
			reservations={[]}
			reservationLabels={{}}
			useReservationTimes={false}
			onOpenReservation={() => {}}
		/>,
	)

	assert.ok(screen.getByText('Este cliente no tiene reservas futuras.'))
})
