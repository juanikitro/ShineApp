import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CustomerDashboardView } from './CustomerDashboardView'

afterEach(cleanup)

function renderDashboard(overrides = {}) {
	return render(
		<CustomerDashboardView
			dashboard={{ id: 1, name: 'Ana' }}
			history={null}
			loading={false}
			allVehicles={[]}
			allReservations={[]}
			allQuotes={[]}
			allWorkOrders={[]}
			useReservationTimes={false}
			orderLabels={{}}
			reservationLabels={{}}
			quoteStatusLabels={{}}
			paymentMethodLabels={{}}
			onBack={() => {}}
			onEditCustomer={() => {}}
			onOpenVehicle={() => {}}
			onOpenReservation={() => {}}
			onOpenQuote={() => {}}
			onOpenOrder={() => {}}
			{...overrides}
		/>,
	)
}

test('CustomerDashboardView preserves dashboard fallbacks without history', () => {
	renderDashboard()

	assert.ok(screen.getByText('Ana'))
	assert.ok(screen.getByText('Sin telefono'))
	assert.ok(screen.getByText('Sin email'))
	assert.ok(
		screen.getByText('No se pudo cargar el historial economico del cliente.'),
	)
})

test('CustomerDashboardView preserves dashboard history data', () => {
	renderDashboard({
		dashboard: { id: 1, name: 'Fallback' },
		history: {
			customer: {
				id: 2,
				name: 'Bea',
				phone: '11 5555-0000',
				email: 'bea@example.com',
				birthday_label: '22/07',
			},
			summary: { sales_total: 100, work_orders_count: 1 },
			vehicles: [{ id: 3, license_plate: 'AA123BB' }],
			services: [{ id: 4, name: 'Lavado', work_orders_count: 1 }],
			vehicles_ranking: [],
			brands_ranking: [],
			work_orders: [],
			payments_history: [],
			upcoming_reservations: [],
			recent_quotes: [],
		},
	})

	assert.ok(screen.getByText('Bea'))
	assert.ok(screen.getByText('11 5555-0000'))
	assert.ok(screen.getByText('bea@example.com'))
	assert.ok(screen.getByText('22/07'))
	assert.ok(screen.getByText('Lavado'))
	assert.ok(screen.getByText('Este cliente todavia no tiene pagos.'))
})
