import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	cashMovementDetailOptions,
	debtDetailOptions,
} from './detail-finance-options'

const expenseCategoryTree = {
	Insumos: ['Quimicos', 'Repuestos'],
	Servicios: ['Limpieza'],
}

test('cashMovementDetailOptions keeps income categories and hides expense subcategories', () => {
	assert.deepEqual(
		cashMovementDetailOptions(
			{ movement_type: 'income', category: 'Servicio especial' },
			['Lavado'],
			['Insumos'],
			expenseCategoryTree,
			[{ category: 'Insumos', subcategory: 'Quimicos' }],
		),
		{
			isExpenseMovement: false,
			categoryOptions: [
				{ value: 'Servicio especial', label: 'Servicio especial' },
				{ value: 'Lavado', label: 'Lavado' },
			],
			subcategoryOptions: [],
		},
	)
})

test('cashMovementDetailOptions merges expense tree and historical subcategories', () => {
	assert.deepEqual(
		cashMovementDetailOptions(
			{
				movement_type: 'expense',
				category: 'Insumos',
				subcategory: 'Especial',
			},
			['Lavado'],
			['Insumos'],
			expenseCategoryTree,
			[
				{ category: 'Insumos', subcategory: 'Accesorios' },
				{ category: 'Servicios', subcategory: 'Limpieza' },
			],
		),
		{
			isExpenseMovement: true,
			categoryOptions: [{ value: 'Insumos', label: 'Insumos' }],
			subcategoryOptions: [
				{ value: 'Especial', label: 'Especial' },
				{ value: 'Accesorios', label: 'Accesorios' },
				{ value: 'Quimicos', label: 'Quimicos' },
				{ value: 'Repuestos', label: 'Repuestos' },
			],
		},
	)
})

test('cashMovementDetailOptions treats a missing movement type as the non-income category branch', () => {
	assert.deepEqual(
		cashMovementDetailOptions(
			{ category: 'Insumos' },
			['Lavado'],
			['Insumos', 'Servicios'],
			expenseCategoryTree,
			[],
		),
		{
			isExpenseMovement: false,
			categoryOptions: [
				{ value: 'Insumos', label: 'Insumos' },
				{ value: 'Servicios', label: 'Servicios' },
			],
			subcategoryOptions: [],
		},
	)
})

test('debtDetailOptions retains the selected category and merges historical subcategories', () => {
	assert.deepEqual(
		debtDetailOptions(
			{
				expense_category: 'Insumos',
				expense_subcategory: 'Especial',
			},
			['Insumos'],
			expenseCategoryTree,
			[
				{ expense_category: 'Insumos', expense_subcategory: 'Accesorios' },
				{ expense_category: 'Servicios', expense_subcategory: 'Limpieza' },
			],
		),
		{
			expenseCategoryOptions: [{ value: 'Insumos', label: 'Insumos' }],
			expenseSubcategoryOptions: [
				{ value: 'Especial', label: 'Especial' },
				{ value: 'Accesorios', label: 'Accesorios' },
				{ value: 'Quimicos', label: 'Quimicos' },
				{ value: 'Repuestos', label: 'Repuestos' },
			],
		},
	)
})
