import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { MaterialPurchaseForm } from './MaterialPurchaseForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setPurchaseForm = vi.fn()
	const onOpenMaterial = vi.fn()
	const focusField = vi.fn()
	const focusHandler = vi.fn()
	const focusNextOnEnter = vi.fn((_: string) => focusHandler)
	const props = {
		submitLabel: 'Guardar compra',
		purchaseForm: {
			material: '7',
			quantity: '4',
			total_cost: '1000',
			affects_cash: true,
		},
		setPurchaseForm,
		onSubmit,
		materialOptions: [{ value: '7', label: 'Shampoo' }],
		materialClassName: 'purchase-flash',
		onOpenMaterial,
		selectedMaterial: { id: 7, unit: 'ml' },
		focusField,
		focusNextOnEnter,
		submitting: false,
		...overrides,
	} as Parameters<typeof MaterialPurchaseForm>[0]

	return {
		...render(<MaterialPurchaseForm {...props} />),
		onSubmit,
		setPurchaseForm,
		onOpenMaterial,
		focusField,
		focusNextOnEnter,
		focusHandler,
	}
}

test('MaterialPurchaseForm preserves fields, unit summary, focus and submit behavior', () => {
	const {
		container,
		onSubmit,
		setPurchaseForm,
		focusNextOnEnter,
		focusHandler,
	} = renderForm()
	const quantity = screen.getByLabelText('Cantidad')

	assert.ok(container.querySelector('.purchase-flash'))
	assert.ok(screen.getByText(/por ml/))
	assert.deepEqual(focusNextOnEnter.mock.calls, [
		['material-purchase.total_cost'],
	])
	fireEvent.change(quantity, { target: { value: '5' } })
	assert.deepEqual(setPurchaseForm.mock.calls[0][0], {
		material: '7',
		quantity: '5',
		total_cost: '1000',
		affects_cash: true,
	})
	fireEvent.keyDown(quantity, { key: 'Enter' })
	assert.equal(focusHandler.mock.calls.length, 1)
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('MaterialPurchaseForm preserves material actions, cash toggle and loading state', () => {
	const { setPurchaseForm, onOpenMaterial, focusField } = renderForm({
		selectedMaterial: null,
		submitting: true,
	})
	const trigger = screen.getByRole('combobox', { name: 'Material' })

	fireEvent.click(trigger)
	fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))
	assert.equal(onOpenMaterial.mock.calls.length, 1)
	fireEvent.click(trigger)
	fireEvent.click(screen.getByRole('option', { name: 'Shampoo' }))
	assert.equal(setPurchaseForm.mock.calls[0][0].material, '7')
	assert.deepEqual(focusField.mock.calls, [['material-purchase.quantity']])

	fireEvent.click(screen.getByRole('checkbox'))
	assert.equal(setPurchaseForm.mock.calls[1][0].affects_cash, false)
	const button = screen.getByRole('button', {
		name: 'Guardar compra',
	}) as HTMLButtonElement
	assert.equal(button.disabled, true)
})
