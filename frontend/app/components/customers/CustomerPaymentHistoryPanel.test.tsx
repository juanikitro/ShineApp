import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CustomerPaymentHistoryPanel } from './CustomerPaymentHistoryPanel'

afterEach(cleanup)

test('CustomerPaymentHistoryPanel preserves payment details and labels', () => {
	render(
		<CustomerPaymentHistoryPanel
			paymentMethodLabels={{ cash: 'Efectivo' }}
			payments={[
				{
					id: 5,
					service: 'Lavado',
					vehicle: 'Fiesta',
					paid_at: '2026-07-22T10:30:00',
					payment_type: 'deposit',
					method: 'cash',
					notes: 'Reserva',
					amount: 100,
				},
			]}
		/>,
	)

	assert.ok(screen.getByRole('heading', { name: 'Historial de pagos' }))
	assert.ok(screen.getByText('1 pagos registrados'))
	assert.ok(screen.getByText('Lavado - Fiesta'))
	assert.ok(screen.getByText(/Sena - Efectivo/))
	assert.ok(screen.getByText('Reserva'))
})

test('CustomerPaymentHistoryPanel preserves its empty message', () => {
	render(<CustomerPaymentHistoryPanel paymentMethodLabels={{}} payments={[]} />)

	assert.ok(screen.getByText('Este cliente todavia no tiene pagos.'))
})
