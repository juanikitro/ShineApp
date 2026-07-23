import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { CashCategoryForm } from './CashCategoryForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setForm = vi.fn()
	const focusField = vi.fn()
	const onCancel = vi.fn()
	const props = {
		form: {
			movement_type: 'expense',
			name: 'Insumos',
			originalName: '',
		},
		setForm,
		onSubmit,
		focusField,
		onCancel,
		submitting: false,
		...overrides,
	} as Parameters<typeof CashCategoryForm>[0]

	return {
		...render(<CashCategoryForm {...props} />),
		onSubmit,
		setForm,
		focusField,
		onCancel,
	}
}

test('CashCategoryForm preserves type selection, name field and submit behavior', () => {
	const { container, onSubmit, setForm, focusField } = renderForm()
	const type = screen.getByRole('combobox', { name: 'Tipo' })
	const name = screen.getByLabelText('Nombre de la categoria de egreso')

	assert.equal(name.getAttribute('placeholder'), 'Categoria de egreso')
	assert.ok(screen.getByText(/agregarle subcategorias mas tarde/))
	fireEvent.click(type)
	fireEvent.click(screen.getByRole('option', { name: 'Ingreso' }))
	assert.deepEqual(setForm.mock.calls[0][0], {
		movement_type: 'income',
		name: 'Insumos',
		originalName: '',
	})
	assert.deepEqual(focusField.mock.calls, [['cash-category.name']])
	fireEvent.change(name, { target: { value: 'Ventas' } })
	assert.equal(setForm.mock.calls[1][0].name, 'Ventas')
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('CashCategoryForm preserves editing controls and pending presentation', () => {
	const { onCancel } = renderForm({
		form: {
			movement_type: 'income',
			name: 'Ventas',
			originalName: 'Ventas',
		},
		submitting: true,
	})
	const type = screen.getByRole('combobox', {
		name: 'Tipo',
	}) as HTMLButtonElement

	assert.equal(type.disabled, true)
	assert.equal(screen.getByText('Guardar cambios').closest('button')?.disabled, true)
	fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
	assert.equal(onCancel.mock.calls.length, 1)
})
