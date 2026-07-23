import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { MaterialPurchaseDetailEditForm } from './MaterialPurchaseDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const props = {
		data: {
			material: '1',
			purchased_at: '2026-07-22',
			quantity: '4',
			total_cost: '2000',
			affects_cash: false,
			observations: 'Proveedor habitual',
		},
		onSubmit,
		onPatch,
		materialOptions: [
			{ value: '1', label: 'Shampoo' },
			{ value: '2', label: 'Cera' },
		],
		unitCost: '$ 500',
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof MaterialPurchaseDetailEditForm>[0]

	return {
		...render(<MaterialPurchaseDetailEditForm {...props} />),
		onSubmit,
		onPatch,
	}
}

test('MaterialPurchaseDetailEditForm preserves material fields, unit cost and actions', () => {
	const { container, onSubmit, onPatch } = renderForm()

	assert.ok(screen.getByText('$ 500'))
	fireEvent.change(screen.getByLabelText('Cantidad'), {
		target: { value: '5' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Material' }))
	fireEvent.click(screen.getByRole('option', { name: 'Cera' }))
	assert.deepEqual(onPatch.mock.calls, [
		[{ quantity: '5' }],
		[{ material: '2' }],
	])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('MaterialPurchaseDetailEditForm preserves the cash impact toggle', () => {
	const { onPatch } = renderForm()
	const toggle = screen.getByLabelText('Impacta en caja') as HTMLInputElement

	assert.equal(toggle.checked, false)
	fireEvent.click(toggle)
	assert.deepEqual(onPatch.mock.calls, [[{ affects_cash: true }]])
})
