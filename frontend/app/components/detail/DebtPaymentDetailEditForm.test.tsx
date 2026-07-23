import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { DebtPaymentDetailEditForm } from './DebtPaymentDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const props = {
		data: {
			debt: '1',
			amount: '1500',
			paid_at: '2026-07-22',
			method: 'cash',
			notes: 'Pago parcial',
		},
		onSubmit,
		onPatch,
		debtOptions: [{ value: '1', label: 'Proveedor' }],
		paymentMethodOptions: [
			{ value: 'cash', label: 'Efectivo' },
			{ value: 'transfer', label: 'Transferencia' },
		],
		defaultPaymentMethod: 'cash',
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof DebtPaymentDetailEditForm>[0]

	return {
		...render(<DebtPaymentDetailEditForm {...props} />),
		onSubmit,
		onPatch,
	}
}

test('DebtPaymentDetailEditForm preserves debt payment fields, method selection and actions', () => {
	const { container, onSubmit, onPatch } = renderForm()
	const amount = screen.getByLabelText('Importe')

	assert.equal(amount.getAttribute('min'), '0')
	fireEvent.change(amount, { target: { value: '2000' } })
	fireEvent.change(screen.getByLabelText('Notas'), {
		target: { value: 'Transferido' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Medio' }))
	fireEvent.click(screen.getByRole('option', { name: 'Transferencia' }))
	assert.deepEqual(onPatch.mock.calls, [
		[{ amount: '2000' }],
		[{ notes: 'Transferido' }],
		[{ method: 'transfer' }],
	])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('DebtPaymentDetailEditForm preserves the default method for missing data', () => {
	renderForm({ data: { debt: '1' } })

	assert.ok(screen.getByRole('combobox', { name: 'Medio' }).textContent?.includes('Efectivo'))
})
