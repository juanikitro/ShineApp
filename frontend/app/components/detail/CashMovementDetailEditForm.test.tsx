import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { CashMovementDetailEditForm } from './CashMovementDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const onMovementTypeChange = vi.fn()
	const onCategoryChange = vi.fn()
	const onCreateCategory = vi.fn()
	const onSubcategoryChange = vi.fn()
	const onCreateSubcategory = vi.fn()
	const onAdjustsClosedDayChange = vi.fn()
	const props = {
		data: {
			movement_type: 'expense',
			category: 'Insumos',
			subcategory: 'Quimicos',
			amount: '2000',
			occurred_at: '2026-07-22T10:30:00Z',
			adjusts_closed_day: '',
			description: 'Compra',
		},
		onSubmit,
		onPatch,
		typeOptions: [
			{ value: 'income', label: 'Ingreso' },
			{ value: 'expense', label: 'Egreso' },
		],
		categoryOptions: [{ value: 'Insumos', label: 'Insumos' }],
		subcategoryOptions: [{ value: 'Quimicos', label: 'Quimicos' }],
		showSubcategory: true,
		subcategoryPlaceholder: 'Subcategoria',
		subcategoryDisabled: false,
		onMovementTypeChange,
		onCategoryChange,
		onCreateCategory,
		onSubcategoryChange,
		onCreateSubcategory,
		onAdjustsClosedDayChange,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof CashMovementDetailEditForm>[0]

	return {
		...render(<CashMovementDetailEditForm {...props} />),
		onSubmit,
		onPatch,
		onCategoryChange,
		onSubcategoryChange,
		onAdjustsClosedDayChange,
	}
}

test('CashMovementDetailEditForm preserves expense category controls, fields and actions', () => {
	const {
		container,
		onSubmit,
		onPatch,
		onCategoryChange,
		onSubcategoryChange,
		onAdjustsClosedDayChange,
	} = renderForm()

	assert.equal(screen.getByLabelText('Importe').getAttribute('min'), '0')
	fireEvent.change(screen.getByLabelText('Detalle'), {
		target: { value: 'Compra mayorista' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))
	fireEvent.click(screen.getByRole('option', { name: 'Insumos' }))
	fireEvent.click(screen.getByRole('combobox', { name: 'Subcategoria' }))
	fireEvent.click(screen.getByRole('option', { name: 'Quimicos' }))
	fireEvent.change(screen.getByLabelText('Corrige cierre'), {
		target: { value: '2026-07-21' },
	})
	assert.deepEqual(onPatch.mock.calls, [[{ description: 'Compra mayorista' }]])
	assert.deepEqual(onCategoryChange.mock.calls, [['Insumos']])
	assert.deepEqual(onSubcategoryChange.mock.calls, [['Quimicos']])
	assert.deepEqual(onAdjustsClosedDayChange.mock.calls, [['2026-07-21']])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('CashMovementDetailEditForm hides expense-only subcategory for income', () => {
	renderForm({
		data: { movement_type: 'income', category: 'Ventas' },
		showSubcategory: false,
	})

	assert.equal(screen.queryByRole('combobox', { name: 'Subcategoria' }), null)
})
