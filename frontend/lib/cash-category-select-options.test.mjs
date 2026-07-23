import assert from 'node:assert/strict'
import { test } from 'vitest'

import { cashCategorySelectOptions } from './cash-category-select-options'

const baseInput = {
	cashIncomeCategoryValues: ['Cobros'],
	cashExpenseCategoryValues: ['Insumos', 'Servicios'],
	movementForm: {
		movement_type: 'income',
		category: 'Cobros',
		subcategory: 'Efectivo',
	},
	debtForm: {
		expense_category: 'Insumos',
		expense_subcategory: 'Factura',
	},
	fixedExpenseForm: {
		expense_category: 'Servicios',
		expense_subcategory: 'Internet',
	},
	expenseClassificationForm: {
		movement_type: 'income',
		category: 'Cobros',
		subcategory: 'Caja',
	},
	incomeCategoryTree: {
		Cobros: ['Transferencia'],
	},
	expenseCategoryTree: {
		Insumos: ['Proveedor'],
		Servicios: ['Luz'],
	},
	cashMovements: [
		{ category: 'Cobros', subcategory: 'QR' },
		{ category: 'Servicios', subcategory: 'Luz' },
	],
	debts: [
		{ expense_category: 'Insumos', expense_subcategory: 'Factura' },
	],
	fixedExpenses: [
		{ expense_category: 'Servicios', expense_subcategory: 'Internet' },
	],
}

function optionValues(options) {
	return options.map((option) => option.value)
}

test('cashCategorySelectOptions preserves category and subcategory options for income forms', () => {
	const options = cashCategorySelectOptions(baseInput)

	assert.deepEqual(optionValues(options.incomeCategorySelectOptions), ['Cobros'])
	assert.deepEqual(optionValues(options.expenseCategorySelectOptions), [
		'Cobros',
		'Insumos',
		'Servicios',
	])
	assert.deepEqual(optionValues(options.debtExpenseCategorySelectOptions), [
		'Insumos',
		'Servicios',
	])
	assert.deepEqual(optionValues(options.fixedExpenseCategorySelectOptions), [
		'Insumos',
		'Servicios',
	])
	assert.deepEqual(optionValues(options.settingsClassificationCategoryOptions), [
		'Cobros',
	])
	assert.deepEqual(options.selectedMovementSubcategoryValues, [
		'QR',
		'Transferencia',
	])
	assert.deepEqual(optionValues(options.movementSubcategorySelectOptions), [
		'Efectivo',
		'QR',
		'Transferencia',
	])
	assert.deepEqual(options.debtExpenseSubcategoryValues, [
		'Factura',
		'Proveedor',
	])
	assert.deepEqual(optionValues(options.debtExpenseSubcategorySelectOptions), [
		'Factura',
		'Proveedor',
	])
	assert.deepEqual(options.fixedExpenseSubcategoryValues, ['Internet', 'Luz'])
	assert.deepEqual(optionValues(options.fixedExpenseSubcategorySelectOptions), [
		'Internet',
		'Luz',
	])
	assert.deepEqual(optionValues(options.settingsClassificationSubcategoryOptions), [
		'Caja',
		'Transferencia',
	])
})

test('cashCategorySelectOptions selects expense branches for movement and classification forms', () => {
	const options = cashCategorySelectOptions({
		...baseInput,
		movementForm: {
			movement_type: 'expense',
			category: 'Servicios',
			subcategory: 'Luz',
		},
		expenseClassificationForm: {
			movement_type: 'expense',
			category: 'Servicios',
			subcategory: 'Luz',
		},
	})

	assert.deepEqual(options.selectedMovementSubcategoryValues, ['Luz'])
	assert.deepEqual(optionValues(options.movementSubcategorySelectOptions), ['Luz'])
	assert.deepEqual(optionValues(options.settingsClassificationCategoryOptions), [
		'Insumos',
		'Servicios',
	])
	assert.deepEqual(optionValues(options.settingsClassificationSubcategoryOptions), [
		'Luz',
	])
})
