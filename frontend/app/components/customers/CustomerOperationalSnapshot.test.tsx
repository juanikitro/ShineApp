import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CustomerOperationalSnapshot } from './CustomerOperationalSnapshot'

afterEach(cleanup)

test('CustomerOperationalSnapshot preserves populated customer insights', () => {
	render(
		<CustomerOperationalSnapshot
			history={{
				insights: {
					last_visit_at: '2026-07-20',
					days_since_last_visit: 2,
					last_service_name: 'Lavado',
					last_vehicle_label: 'Fiesta',
					open_quotes_count: 1,
					balance_due_work_orders_count: 2,
					average_ticket: 100,
					average_days_between_visits: 30,
					preferred_service_name: 'Detailing',
					preferred_vehicle_label: 'Focus',
					preferred_brand_name: 'Ford',
				},
				summary: { balance_due_total: 50 },
			}}
			upcomingReservations={[
				{ day: '2026-07-25', services: 'Lavado', vehicle: 'Fiesta' },
			]}
			recentQuotes={[{ quote_date: '2026-07-21', total: 120 }]}
			useReservationTimes={false}
		/>,
	)

	assert.ok(screen.getByRole('heading', { name: 'Estado del cliente' }))
	assert.ok(screen.getByText('Lavado · Fiesta'))
	assert.ok(screen.getByText('Detailing'))
	assert.ok(screen.getByText(/Focus · Ford/))
})

test('CustomerOperationalSnapshot preserves empty insight fallbacks', () => {
	render(
		<CustomerOperationalSnapshot
			history={{}}
			upcomingReservations={[]}
			recentQuotes={[]}
			useReservationTimes={false}
		/>,
	)

	assert.ok(screen.getByText('Sin trabajos'))
	assert.ok(screen.getByText('Sin agenda futura para este cliente.'))
	assert.ok(screen.getByText('0 cotizaciones registradas'))
	assert.ok(screen.getByText('Sin servicio frecuente'))
	assert.ok(screen.getByText('Todavia no hay recurrencia suficiente.'))
})
