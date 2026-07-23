import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { FixedExpenseOccurrencePaymentForm } from './FixedExpenseOccurrencePaymentForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onAmountChange = vi.fn()
	const onUpdateTemplateChange = vi.fn()
	const onMethodChange = vi.fn()
	const onPaidAtChange = vi.fn()
	const props = {
		form: {
			amount: '1100',
			update_template: false,
			method: 'cash',
			paid_at: '2026-07-22',
		},
		onSubmit,
		onAmountChange,
		onUpdateTemplateChange,
		onMethodChange,
		onPaidAtChange,
		paymentMethodOptions: [
			{ value: 'cash', label: 'Efectivo' },
			{ value: 'transfer', label: 'Transferencia' },
		],
		showUpdateTemplate: true,
		originalAmountLabel: '$ 1000',
		amountLabel: '$ 1100',
		...overrides,
	} as Parameters<typeof FixedExpenseOccurrencePaymentForm>[0]

	return {
		...render(<FixedExpenseOccurrencePaymentForm {...props} />),
		onSubmit,
		onAmountChange,
		onUpdateTemplateChange,
		onMethodChange,
		onPaidAtChange,
	}
}

test('FixedExpenseOccurrencePaymentForm preserves fields, template toggle and submit', () => {
	const {
		container,
		onSubmit,
		onAmountChange,
		onUpdateTemplateChange,
		onMethodChange,
		onPaidAtChange,
	} = renderForm()
	const amount = container.querySelector<HTMLInputElement>(
		'#fixed-expense-pay\\.amount',
	)!

	assert.equal(amount.getAttribute('step'), 'any')
	assert.ok(container.textContent?.includes('$ 1000 → $ 1100'))
	fireEvent.change(amount, {
		target: { value: '1200' },
	})
	fireEvent.click(container.querySelector('.toggle-label input')!)
	fireEvent.change(screen.getByLabelText('Metodo de pago'), {
		target: { value: 'transfer' },
	})
	fireEvent.change(screen.getByLabelText('Fecha de pago'), {
		target: { value: '2026-07-23' },
	})
	assert.deepEqual(onAmountChange.mock.calls, [['1200']])
	assert.deepEqual(onUpdateTemplateChange.mock.calls, [[true]])
	assert.deepEqual(onMethodChange.mock.calls, [['transfer']])
	assert.deepEqual(onPaidAtChange.mock.calls, [['2026-07-23']])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('FixedExpenseOccurrencePaymentForm hides the template option for original amount', () => {
	const { container } = renderForm({ showUpdateTemplate: false })

	assert.equal(container.querySelector('.toggle-label'), null)
})
