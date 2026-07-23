import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { AgendaWorkOrderPaymentForm } from './AgendaWorkOrderPaymentForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const onPaymentTypeChange = vi.fn()
	const onMethodChange = vi.fn()
	const props = {
		form: {
			amount: '10000',
			payment_type: 'payment',
			method: 'cash',
			notes: '',
		},
		onSubmit,
		onPatch,
		onPaymentTypeChange,
		onMethodChange,
		info: <>Ana - Ford Fiesta - Lavado completo</>,
		workOrderSummary: <div data-testid="work-order-summary">Resumen</div>,
		submitting: false,
		...overrides,
	} as Parameters<typeof AgendaWorkOrderPaymentForm>[0]

	return {
		...render(<AgendaWorkOrderPaymentForm {...props} />),
		onSubmit,
		onPatch,
		onPaymentTypeChange,
		onMethodChange,
	}
}

test('AgendaWorkOrderPaymentForm preserves payment fields, callbacks and submit behavior', () => {
	const {
		container,
		onSubmit,
		onPatch,
		onPaymentTypeChange,
		onMethodChange,
	} = renderForm()

	assert.equal(screen.getByText('Ana - Ford Fiesta - Lavado completo').closest('.info-note') !== null, true)
	assert.ok(screen.getByTestId('work-order-summary'))

	fireEvent.change(screen.getByLabelText('Importe'), {
		target: { value: '12000' },
	})
	fireEvent.change(screen.getByLabelText('Observaciones'), {
		target: { value: 'Transferido' },
	})
	assert.deepEqual(onPatch.mock.calls, [
		[{ amount: '12000' }],
		[{ notes: 'Transferido' }],
	])

	fireEvent.click(screen.getByRole('combobox', { name: 'Tipo' }))
	fireEvent.click(screen.getByRole('option', { name: 'Sena' }))
	fireEvent.click(screen.getByRole('combobox', { name: 'Medio' }))
	fireEvent.click(screen.getByRole('option', { name: 'Tarjeta' }))
	assert.deepEqual(onPaymentTypeChange.mock.calls, [['deposit']])
	assert.deepEqual(onMethodChange.mock.calls, [['card']])

	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('AgendaWorkOrderPaymentForm keeps the pending submit presentation', () => {
	renderForm({ submitting: true })
	const button = screen.getByRole('button', {
		name: 'Registrar pago',
	}) as HTMLButtonElement

	assert.equal(button.disabled, true)
	assert.equal(button.getAttribute('aria-busy'), 'true')
	assert.ok(button.querySelector('.button-spinner'))
})
