import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	view: null as Record<string, any> | null,
}))

vi.mock('./CustomerDashboardView', () => ({
	CustomerDashboardView: (props: Record<string, any>) => {
		capturedProps.view = props
		return <span>Dashboard de cliente</span>
	},
}))

import { renderCustomerDashboard } from './customer-dashboard-renderer'

afterEach(cleanup)

function renderDashboard(overrides: Record<string, unknown> = {}) {
	const onBack = vi.fn()
	const onOpenDetail = vi.fn()
	const dashboard = { id: 'customer-1', name: 'Ana' }
	const result = renderCustomerDashboard({
		dashboard,
		canViewEconomy: true,
		history: null,
		loading: false,
		vehicles: [{ id: 'vehicle-1' }],
		reservations: [{ id: 'reservation-1' }],
		quotes: [{ id: 'quote-1' }],
		workOrders: [{ id: 'workorder-1' }],
		useReservationTimes: true,
		orderLabels: { ready: 'Listo' },
		reservationLabels: { confirmed: 'Confirmada' },
		quoteStatusLabels: { draft: 'Sin enviar' },
		paymentMethodLabels: { cash: 'Efectivo' },
		onBack,
		onOpenDetail,
		...overrides,
	} as Parameters<typeof renderCustomerDashboard>[0])

	return { dashboard, onBack, onOpenDetail, result }
}

test('customer dashboard renderer preserves dashboard data and detail callback mapping', () => {
	const { dashboard, onBack, onOpenDetail, result } = renderDashboard()
	render(result)

	assert.ok(screen.getByText('Dashboard de cliente'))
	assert.equal(capturedProps.view?.dashboard, dashboard)
	assert.equal(capturedProps.view?.useReservationTimes, true)
	capturedProps.view?.onBack()
	capturedProps.view?.onEditCustomer({ id: 'customer-1' })
	capturedProps.view?.onOpenVehicle({ id: 'vehicle-1' })
	capturedProps.view?.onOpenReservation({ id: 'reservation-1' })
	capturedProps.view?.onOpenQuote({ id: 'quote-1' })
	capturedProps.view?.onOpenOrder({ id: 'workorder-1' })

	assert.equal(onBack.mock.calls.length, 1)
	assert.deepEqual(onOpenDetail.mock.calls, [
		['Cliente', { id: 'customer-1' }, { startEditing: true }],
		['Vehiculo', { id: 'vehicle-1' }],
		['Reserva', { id: 'reservation-1' }],
		['Cotizacion', { id: 'quote-1' }],
		['Orden de trabajo', { id: 'workorder-1' }],
	])
})

test('customer dashboard renderer keeps the economy and missing-dashboard guard', () => {
	assert.equal(renderDashboard({ dashboard: null }).result, null)
	assert.equal(renderDashboard({ canViewEconomy: false }).result, null)
})
