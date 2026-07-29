import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	cashMovement: null as Record<string, any> | null,
	debt: null as Record<string, any> | null,
	debtPayment: null as Record<string, any> | null,
}))

vi.mock('./CashMovementDetailEditForm', () => ({
	CashMovementDetailEditForm: (props: Record<string, any>) => {
		capturedProps.cashMovement = props
		return <span>Editor de caja</span>
	},
}))

vi.mock('./DebtDetailEditForm', () => ({
	DebtDetailEditForm: (props: Record<string, any>) => {
		capturedProps.debt = props
		return <span>Editor de deuda</span>
	},
}))

vi.mock('./DebtPaymentDetailEditForm', () => ({
	DebtPaymentDetailEditForm: (props: Record<string, any>) => {
		capturedProps.debtPayment = props
		return <span>Editor de pago de deuda</span>
	},
}))

import {
	renderCashMovementDetailEditor,
	renderDebtDetailEditor,
	renderDebtPaymentDetailEditor,
} from './financial-detail-edit-form-renderers'

afterEach(cleanup)

test('cash movement detail renderer preserves expense callbacks and actions', () => {
	const onPatch = vi.fn()
	const validExpenseSubcategory = vi.fn(() => 'Repuestos')
	const onCreateExpenseSubcategory = vi.fn()
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)

	render(
		renderCashMovementDetailEditor({
			data: {
				movement_type: 'expense',
				category: 'Insumos',
				subcategory: 'Repuestos',
			},
			onSubmit: () => {},
			onPatch,
			cashIncomeCategoryValues: ['Lavado'],
			cashExpenseCategoryValues: ['Insumos'],
			expenseCategoryTree: { Insumos: ['Repuestos'] },
			cashMovements: [{ category: 'Insumos', subcategory: 'Quimicos' }],
			validExpenseSubcategory,
			onCreateExpenseSubcategory,
			renderActions,
		}),
	)

	assert.ok(screen.getByText('Editor de caja'))
	assert.equal(renderActions.mock.calls.length, 1)
	assert.equal(capturedProps.cashMovement?.showSubcategory, true)
	assert.deepEqual(capturedProps.cashMovement?.subcategoryOptions, [
		{ value: 'Quimicos', label: 'Quimicos' },
		{ value: 'Repuestos', label: 'Repuestos' },
	])
	capturedProps.cashMovement?.onCategoryChange('Servicios')
	capturedProps.cashMovement?.onCreateCategory('Nuevo')
	capturedProps.cashMovement?.onCreateSubcategory('Especial')
	capturedProps.cashMovement?.onAdjustsClosedDayChange('2026-07-22')

	assert.deepEqual(validExpenseSubcategory.mock.calls, [
		['Servicios', 'Repuestos'],
	])
	assert.deepEqual(onCreateExpenseSubcategory.mock.calls, [
		['Insumos', 'Especial'],
	])
	assert.deepEqual(onPatch.mock.calls, [
		[{ category: 'Servicios', subcategory: 'Repuestos' }],
		[{ category: 'Nuevo', subcategory: '' }],
		[{ subcategory: 'Especial' }],
		[
			{
				adjusts_closed_day: '2026-07-22',
				category: 'Ajustes',
				subcategory: 'Ajuste de cierre',
			},
		],
	])
})

test('cash movement detail renderer keeps income without expense-only creation', () => {
	render(
		renderCashMovementDetailEditor({
			data: { movement_type: 'income', category: 'Lavado' },
			onSubmit: () => {},
			onPatch: () => {},
			cashIncomeCategoryValues: ['Lavado'],
			cashExpenseCategoryValues: ['Insumos'],
			expenseCategoryTree: {},
			cashMovements: [],
			validExpenseSubcategory: () => '',
			onCreateExpenseSubcategory: () => {},
			renderActions: () => null,
		}),
	)

	assert.equal(capturedProps.cashMovement?.showSubcategory, false)
	assert.equal(capturedProps.cashMovement?.onCreateCategory, undefined)
})

test('debt detail renderer preserves supplier, category and subcategory callbacks', () => {
	const onPatch = vi.fn()
	const validExpenseSubcategory = vi.fn(() => 'Repuestos')
	const onCreateExpenseSubcategory = vi.fn()
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)

	render(
		renderDebtDetailEditor({
			data: {
				creditor: 'Pendiente',
				expense_category: 'Insumos',
				expense_subcategory: 'Repuestos',
				status: 'pending',
				total_paid: '100',
				balance_due: '50',
			},
			onSubmit: () => {},
			onPatch,
			supplierOptions: [{ value: '1', label: 'Proveedor Uno' }],
			suppliers: [{ id: 1, name: 'Proveedor Uno' }],
			cashExpenseCategoryValues: ['Insumos'],
			expenseCategoryTree: { Insumos: ['Repuestos'] },
			debts: [{ expense_category: 'Insumos', expense_subcategory: 'Quimicos' }],
			validExpenseSubcategory,
			onCreateExpenseSubcategory,
			debtStatusLabels: { pending: 'Pendiente' },
			renderActions,
		}),
	)

	assert.ok(screen.getByText('Editor de deuda'))
	assert.equal(renderActions.mock.calls.length, 1)
	assert.equal(capturedProps.debt?.statusLabel, 'Pendiente')
	capturedProps.debt?.onSupplierChange('1')
	capturedProps.debt?.onExpenseCategoryChange('Servicios')
	capturedProps.debt?.onCreateExpenseCategory('Nuevo')
	capturedProps.debt?.onExpenseSubcategoryChange('Varios')
	capturedProps.debt?.onCreateExpenseSubcategory('Especial')

	assert.deepEqual(validExpenseSubcategory.mock.calls, [
		['Servicios', 'Repuestos'],
	])
	assert.deepEqual(onCreateExpenseSubcategory.mock.calls, [
		['Insumos', 'Especial'],
	])
	assert.deepEqual(onPatch.mock.calls, [
		[{ supplier: '1', creditor: 'Proveedor Uno' }],
		[{ expense_category: 'Servicios', expense_subcategory: 'Repuestos' }],
		[{ expense_category: 'Nuevo', expense_subcategory: '' }],
		[{ expense_subcategory: 'Varios' }],
		[{ expense_subcategory: 'Especial' }],
	])
})

test('debt payment detail renderer preserves payment methods, actions and form references', () => {
	const onSubmit = vi.fn()
	const onPatch = vi.fn()
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)
	const data = { debt: '1', method: 'cash' }
	const debtOptions = [{ value: '1', label: 'Deuda Uno' }]

	render(
		renderDebtPaymentDetailEditor({
			data,
			onSubmit,
			onPatch,
			debtOptions,
			debtPaymentMethodLabels: {
				cash: 'Efectivo',
				transfer: 'Transferencia',
			},
			defaultPaymentMethod: 'cash',
			renderActions,
		}),
	)

	assert.ok(screen.getByText('Editor de pago de deuda'))
	assert.equal(renderActions.mock.calls.length, 1)
	assert.equal(capturedProps.debtPayment?.data, data)
	assert.equal(capturedProps.debtPayment?.onSubmit, onSubmit)
	assert.equal(capturedProps.debtPayment?.onPatch, onPatch)
	assert.equal(capturedProps.debtPayment?.debtOptions, debtOptions)
	assert.deepEqual(capturedProps.debtPayment?.paymentMethodOptions, [
		{ value: 'cash', label: 'Efectivo' },
		{ value: 'transfer', label: 'Transferencia' },
	])
	assert.equal(capturedProps.debtPayment?.defaultPaymentMethod, 'cash')
})
