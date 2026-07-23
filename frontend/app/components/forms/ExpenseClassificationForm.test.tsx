import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { ExpenseClassificationForm } from './ExpenseClassificationForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setForm = vi.fn()
	const focusField = vi.fn()
	const onCancel = vi.fn()
	const props = {
		form: {
			movement_type: 'expense',
			category: 'Insumos',
			subcategory: 'Limpieza',
			originalCategory: '',
			lockCategory: false,
		},
		setForm,
		onSubmit,
		categoryOptions: [{ value: 'Insumos', label: 'Insumos' }],
		focusField,
		onCancel,
		submitting: false,
		...overrides,
	} as Parameters<typeof ExpenseClassificationForm>[0]

	return {
		...render(<ExpenseClassificationForm {...props} />),
		onSubmit,
		setForm,
		focusField,
		onCancel,
	}
}

test('ExpenseClassificationForm preserves category fields, type reset and submit', () => {
	const { container, onSubmit, setForm, focusField } = renderForm()
	const type = screen.getByRole('combobox', { name: 'Tipo' })
	const subcategory = screen.getByLabelText('Denominacion subcategoria')

	assert.equal(subcategory.getAttribute('list'), 'settings-classification-subcategory-options')
	assert.ok(screen.getByText(/Las de egresos tambien se usan en Deudas/))
	fireEvent.click(type)
	fireEvent.click(screen.getByRole('option', { name: 'Ingreso' }))
	assert.deepEqual(setForm.mock.calls[0][0], {
		movement_type: 'income',
		category: '',
		subcategory: '',
		originalCategory: '',
		lockCategory: false,
	})
	assert.deepEqual(focusField.mock.calls, [
		['expense-classification.category'],
	])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('ExpenseClassificationForm preserves editing, locked and pending states', () => {
	const { onCancel } = renderForm({
		form: {
			movement_type: 'income',
			category: 'Ventas',
			subcategory: 'Mostrador',
			originalCategory: 'Ventas',
			lockCategory: true,
		},
		submitting: true,
	})
	const combos = screen.getAllByRole('combobox') as HTMLButtonElement[]

	assert.equal(combos[0].disabled, true)
	assert.equal(combos[1].disabled, true)
	assert.equal(screen.getByText('Guardar cambios').closest('button')?.disabled, true)
	fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
	assert.equal(onCancel.mock.calls.length, 1)
})
