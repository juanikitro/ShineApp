import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	cashMovementFormWithCategory,
	createCashSubcategoryValidators,
	debtFormWithExpenseCategory,
} from './cash-debt-form-updates'

const incomeTree = { Servicios: ['Lavado'] }
const expenseTree = { Insumos: ['Repuestos'], Ajustes: ['Ajuste de cierre'] }

test('cash movement category update keeps only valid income or expense subcategories', () => {
	assert.deepEqual(
		cashMovementFormWithCategory(
			{ movement_type: 'income', category: 'Otro', subcategory: 'Lavado' },
			'Servicios',
			incomeTree,
			expenseTree,
		),
		{ movement_type: 'income', category: 'Servicios', subcategory: 'Lavado' },
	)
	assert.deepEqual(
		cashMovementFormWithCategory(
			{ movement_type: 'expense', category: 'Otro', subcategory: 'Lavado' },
			'Insumos',
			incomeTree,
			expenseTree,
		),
		{ movement_type: 'expense', category: 'Insumos', subcategory: '' },
	)
	assert.equal(
		cashMovementFormWithCategory(
			{ movement_type: 'expense', subcategory: 'Repuestos' },
			'',
			incomeTree,
			expenseTree,
		).subcategory,
		'',
	)
})

test('debt expense category update preserves valid values and clears missing or invalid ones', () => {
	assert.deepEqual(
		debtFormWithExpenseCategory(
			{ creditor: 'Proveedor', expense_category: 'Otro', expense_subcategory: 'Repuestos' },
			'Insumos',
			expenseTree,
		),
		{
			creditor: 'Proveedor',
			expense_category: 'Insumos',
			expense_subcategory: 'Repuestos',
		},
	)
	assert.equal(
		debtFormWithExpenseCategory(
			{ expense_subcategory: 'Invalida' },
			'Insumos',
			expenseTree,
		).expense_subcategory,
		'',
	)
	assert.equal(
		debtFormWithExpenseCategory({}, '', expenseTree).expense_subcategory,
		'',
	)
})

test('createCashSubcategoryValidators keeps both category trees bound to the callbacks', () => {
	const validators = createCashSubcategoryValidators(incomeTree, expenseTree)
	assert.equal(
		validators.validExpenseSubcategoryForCategory('Insumos', 'Repuestos'),
		'Repuestos',
	)
	assert.equal(
		validators.validCashSubcategoryForCategory(
			'income',
			'Servicios',
			'Lavado',
		),
		'Lavado',
	)
	assert.equal(
		validators.validCashSubcategoryForCategory(
			'expense',
			'Insumos',
			'Lavado',
		),
		'',
	)
})
