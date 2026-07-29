import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { DebtDetailEditForm } from './DebtDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const onSupplierChange = vi.fn()
	const onExpenseCategoryChange = vi.fn()
	const onCreateExpenseCategory = vi.fn()
	const onExpenseSubcategoryChange = vi.fn()
	const onCreateExpenseSubcategory = vi.fn()
	const props = {
		data: {
			concept: 'Compra proveedor',
			creditor: 'Acme',
			principal_amount: '10000',
			origin_date: '2026-07-01',
			due_date: '2026-07-30',
			supplier: '1',
			expense_category: 'Insumos',
			expense_subcategory: 'Quimicos',
			notes: 'Pagar viernes',
		},
		onSubmit,
		onPatch,
		supplierOptions: [{ value: '1', label: 'Acme' }],
		expenseCategoryOptions: [{ value: 'Insumos', label: 'Insumos' }],
		expenseSubcategoryOptions: [{ value: 'Quimicos', label: 'Quimicos' }],
		expenseSubcategoryPlaceholder: 'Subcategoria',
		expenseSubcategoryDisabled: false,
		onSupplierChange,
		onExpenseCategoryChange,
		onCreateExpenseCategory,
		onExpenseSubcategoryChange,
		onCreateExpenseSubcategory,
		paidLabel: '$ 2.000',
		balanceLabel: '$ 8.000',
		statusLabel: 'Pendiente',
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof DebtDetailEditForm>[0]

	return {
		...render(<DebtDetailEditForm {...props} />),
		onSubmit,
		onPatch,
		onSupplierChange,
		onExpenseCategoryChange,
		onExpenseSubcategoryChange,
	}
}

test('DebtDetailEditForm preserves debt fields, summary, selection callbacks and actions', () => {
	const {
		container,
		onSubmit,
		onPatch,
		onSupplierChange,
		onExpenseCategoryChange,
		onExpenseSubcategoryChange,
	} = renderForm()

	assert.equal(screen.getByLabelText('Total deuda').getAttribute('min'), '0')
	assert.ok(screen.getByText('$ 8.000'))
	fireEvent.change(screen.getByLabelText('Notas'), {
		target: { value: 'Confirmar pago' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Proveedor vinculado' }))
	fireEvent.click(screen.getByRole('option', { name: 'Acme' }))
	fireEvent.click(screen.getByRole('combobox', { name: 'Categoria del egreso' }))
	fireEvent.click(screen.getByRole('option', { name: 'Insumos' }))
	fireEvent.click(screen.getByRole('combobox', { name: 'Subcategoria' }))
	fireEvent.click(screen.getByRole('option', { name: 'Quimicos' }))
	assert.deepEqual(onPatch.mock.calls, [[{ notes: 'Confirmar pago' }]])
	assert.deepEqual(onSupplierChange.mock.calls, [['1']])
	assert.deepEqual(onExpenseCategoryChange.mock.calls, [['Insumos']])
	assert.deepEqual(onExpenseSubcategoryChange.mock.calls, [['Quimicos']])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('DebtDetailEditForm preserves disabled subcategory selection without a category', () => {
	renderForm({
		data: { concept: 'Deuda', expense_category: '', expense_subcategory: '' },
		expenseSubcategoryDisabled: true,
		expenseSubcategoryPlaceholder: 'Elegir categoria',
	})

	assert.equal(
		(screen.getByRole('combobox', { name: 'Subcategoria' }) as HTMLButtonElement)
			.disabled,
		true,
	)
})
