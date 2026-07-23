import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import {
	renderWorkOrderConsumptionModal,
	renderWorkOrderPaymentModal,
} from './work-order-modal-renderers'

afterEach(cleanup)

const order = {
	id: 7,
	customer_name: 'Ana',
	vehicle_label: 'Ford Fiesta',
	service_name: 'Lavado',
	status: 'ready',
}

test('renderWorkOrderConsumptionModal preserves its modal and economy guard', () => {
	render(
		renderWorkOrderConsumptionModal({
			canViewEconomy: true,
			order,
			onClose: () => {},
			onSubmit: (event) => event.preventDefault(),
			renderFields: () => <span>Campos de consumo</span>,
			submitting: false,
		}),
	)

	assert.ok(screen.getByRole('dialog', { name: 'Consumir materiales del trabajo' }))
	assert.ok(screen.getByText('Ana - Ford Fiesta - Lavado'))
	assert.ok(screen.getByText('Campos de consumo'))
	cleanup()
	render(
		renderWorkOrderConsumptionModal({
			canViewEconomy: false,
			order,
			onClose: () => {},
			onSubmit: () => {},
			renderFields: () => null,
			submitting: false,
		}),
	)
	assert.equal(screen.queryByRole('dialog'), null)
})

test('renderWorkOrderPaymentModal preserves payment form and work-order summary', () => {
	render(
		renderWorkOrderPaymentModal({
			canViewEconomy: true,
			order,
			onClose: () => {},
			form: { amount: '', payment_type: 'full', method: 'cash' },
			onSubmit: (event) => event.preventDefault(),
			onPatch: () => {},
			onPaymentTypeChange: () => {},
			onMethodChange: () => {},
			orderLabels: { ready: 'Listo' },
			submitting: false,
		}),
	)

	assert.ok(screen.getByRole('dialog', { name: 'Cobrar trabajo de la reserva' }))
	assert.ok(screen.getByText('Ana - Ford Fiesta - Lavado'))
	assert.ok(screen.getByText('Listo'))
	cleanup()
	render(
		renderWorkOrderPaymentModal({
			canViewEconomy: false,
			order,
			onClose: () => {},
			form: {},
			onSubmit: () => {},
			onPatch: () => {},
			onPaymentTypeChange: () => {},
			onMethodChange: () => {},
			orderLabels: {},
			submitting: false,
		}),
	)
	assert.equal(screen.queryByRole('dialog'), null)
})
