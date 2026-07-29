import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CustomerHistoryPanel } from './CustomerHistoryPanel'

afterEach(cleanup)

const orderLabels = { ready: 'Listo' }

test('CustomerHistoryPanel preserves the loading state before history data', () => {
	render(
		<CustomerHistoryPanel
			loading
			history={{ work_orders: [] }}
			orderLabels={orderLabels}
			onOpenOrder={() => {}}
		/>,
	)

	assert.ok(screen.getByText('Cargando historial del cliente...'))
})

test('CustomerHistoryPanel preserves the unavailable history state', () => {
	render(
		<CustomerHistoryPanel
			loading={false}
			history={null}
			orderLabels={orderLabels}
			onOpenOrder={() => {}}
		/>,
	)

	assert.ok(screen.getByText('Historial economico no disponible.'))
})

test('CustomerHistoryPanel renders and opens existing work orders', () => {
	const order = {
		id: 7,
		service: 'Lavado',
		vehicle: 'Fiesta',
		status: 'ready',
		received_at: '2026-07-22',
		paid_amount: 100,
		material_cost: 25,
	}
	const opened = [] as unknown[]
	render(
		<CustomerHistoryPanel
			loading={false}
			history={{
				summary: {
					work_orders_count: 1,
					paid_total: 100,
					material_cost_total: 25,
					margin_total: 75,
				},
				work_orders: [order],
			}}
			orderLabels={orderLabels}
			onOpenOrder={(value) => opened.push(value)}
		/>,
	)

	fireEvent.click(screen.getByRole('button', { name: /Lavado - Fiesta/ }))

	assert.ok(screen.getByText('1 registros'))
	assert.ok(screen.getByText(/Listo/))
	assert.deepEqual(opened, [order])
})

test('CustomerHistoryPanel preserves the empty work order message', () => {
	render(
		<CustomerHistoryPanel
			loading={false}
			history={{ summary: {}, work_orders: [] }}
			orderLabels={orderLabels}
			onOpenOrder={() => {}}
		/>,
	)

	assert.ok(screen.getByText('Este cliente todavia no tiene trabajos.'))
})
