import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CustomerSalesHistoryPanel } from './CustomerSalesHistoryPanel'

afterEach(cleanup)

test('CustomerSalesHistoryPanel preserves sales details and opens the complete order', () => {
	const row = {
		id: 7,
		service: 'Lavado',
		vehicle: 'Fiesta',
		received_at: '2026-07-22T10:30:00',
		paid_amount: 100,
		balance_due: 25,
		material_cost: 10,
		status: 'ready',
		total_amount: 125,
	}
	const fullRecord = { ...row, internal_notes: 'Registro completo' }
	const opened = [] as unknown[]
	render(
		<CustomerSalesHistoryPanel
			orders={[row]}
			workOrders={[fullRecord]}
			orderLabels={{ ready: 'Listo' }}
			onOpenOrder={(order) => opened.push(order)}
		/>,
	)

	fireEvent.click(screen.getByRole('button', { name: /Lavado - Fiesta/ }))

	assert.ok(screen.getByText('1 trabajos registrados'))
	assert.ok(screen.getByText('Listo'))
	assert.deepEqual(opened, [fullRecord])
})

test('CustomerSalesHistoryPanel preserves its empty state', () => {
	render(
		<CustomerSalesHistoryPanel
			orders={[]}
			workOrders={[]}
			orderLabels={{}}
			onOpenOrder={() => {}}
		/>,
	)

	assert.ok(screen.getByText('Este cliente todavia no tiene ventas.'))
})
