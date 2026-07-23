import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

let capturedProps: Record<string, any> | null = null

vi.mock('./FixedExpenseOccurrencePaymentForm', () => ({
	FixedExpenseOccurrencePaymentForm: (props: Record<string, any>) => {
		capturedProps = props
		return <span>Formulario de pago fijo</span>
	},
}))

import { renderFixedExpensePaymentModal } from './fixed-expense-payment-modal-renderer'

afterEach(() => {
	cleanup()
	capturedProps = null
})

function renderLayer(form: Record<string, any>) {
	const updates: Record<string, any>[] = []
	const result = render(
		renderFixedExpensePaymentModal({
			form,
			setForm: (next) => {
				updates.push(next)
			},
			onSubmit: (event) => event.preventDefault(),
			paymentMethodOptions: [{ value: 'cash', label: 'Efectivo' }],
			formatMoney: (value) => `$${value}`,
			onClose: () => {},
		}),
	)
	return { ...result, updates }
}

test('renderFixedExpensePaymentModal preserves original amount handling', () => {
	const form = {
		amount: '',
		original_amount: '100',
		update_template: true,
		method: 'cash',
		paid_at: '2026-07-22',
	}
	const { updates } = renderLayer(form)

	assert.ok(screen.getByRole('dialog', { name: 'Registrar pago de gasto fijo' }))
	assert.ok(screen.getByText('Formulario de pago fijo'))
	assert.equal(capturedProps?.showUpdateTemplate, false)
	assert.equal(capturedProps?.originalAmountLabel, '$100')
	capturedProps?.onAmountChange('100')
	assert.deepEqual(updates, [{ ...form, amount: '100', update_template: false }])
})

test('renderFixedExpensePaymentModal preserves changed amount and form patches', () => {
	const form = {
		amount: '150',
		original_amount: '100',
		update_template: true,
		method: 'cash',
		paid_at: '2026-07-22',
	}
	const { updates } = renderLayer(form)

	assert.equal(capturedProps?.showUpdateTemplate, true)
	assert.equal(capturedProps?.amountLabel, '$150')
	capturedProps?.onAmountChange('175')
	capturedProps?.onUpdateTemplateChange(false)
	capturedProps?.onMethodChange('transfer')
	capturedProps?.onPaidAtChange('2026-07-23')
	assert.deepEqual(updates, [
		{ ...form, amount: '175', update_template: true },
		{ ...form, update_template: false },
		{ ...form, method: 'transfer' },
		{ ...form, paid_at: '2026-07-23' },
	])
})
