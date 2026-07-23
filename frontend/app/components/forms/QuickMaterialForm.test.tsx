import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { QuickMaterialForm } from './QuickMaterialForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setMaterialForm = vi.fn()
	const props = {
		materialForm: {
			name: 'Shampoo',
			unit: 'litro',
			stock_quantity: '3',
		},
		setMaterialForm,
		onSubmit,
		submitting: false,
		...overrides,
	} as Parameters<typeof QuickMaterialForm>[0]

	return {
		...render(<QuickMaterialForm {...props} />),
		onSubmit,
		setMaterialForm,
	}
}

test('QuickMaterialForm preserves material fields, stock input and submit behavior', () => {
	const { container, onSubmit, setMaterialForm } = renderForm()
	const unit = screen.getByLabelText('Unidad')
	const stock = screen.getByLabelText('Stock inicial')

	assert.equal(unit.getAttribute('list'), 'material-unit-options')
	assert.equal(stock.getAttribute('type'), 'number')
	assert.equal(screen.getByText('El costo unitario se completa con la primera compra.'), document.querySelector('.info-note'))

	fireEvent.change(unit, { target: { value: 'ml' } })
	fireEvent.change(stock, { target: { value: '5' } })
	assert.deepEqual(setMaterialForm.mock.calls, [
		[
			{
				name: 'Shampoo',
				unit: 'ml',
				stock_quantity: '3',
			},
		],
		[
			{
				name: 'Shampoo',
				unit: 'litro',
				stock_quantity: '5',
			},
		],
	])

	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('QuickMaterialForm keeps the pending submit presentation', () => {
	renderForm({ submitting: true })
	const button = screen.getByRole('button', {
		name: 'Crear material',
	}) as HTMLButtonElement

	assert.equal(button.disabled, true)
	assert.equal(button.getAttribute('aria-busy'), 'true')
	assert.ok(button.querySelector('.button-spinner'))
})
