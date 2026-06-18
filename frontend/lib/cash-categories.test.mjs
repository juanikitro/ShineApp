import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	addExpenseCategory,
	addIncomeCategory,
	removeExpenseCategory,
	removeIncomeCategory,
	renameExpenseCategory,
	renameIncomeCategory,
	removeExpenseCategoryPair,
	removeIncomeCategoryPair,
	upsertExpenseCategoryPair,
	upsertIncomeCategoryPair,
	normalizeExpenseCategoryTree,
	expenseCategoryPairs,
} from './page-support'

test('normalizeExpenseCategoryTree conserva categorias sin subcategorias', () => {
	const tree = normalizeExpenseCategoryTree({
		Servicios: ['Luz'],
		Pendiente: [],
	})
	assert.deepEqual(tree.Pendiente, [])
	assert.deepEqual(tree.Servicios, ['Luz'])
})

test('addExpenseCategory crea una categoria vacia sin tocar las existentes', () => {
	const tree = addExpenseCategory({ Servicios: ['Luz'] }, 'Marketing')
	assert.deepEqual(tree.Marketing, [])
	assert.deepEqual(tree.Servicios, ['Luz'])
})

test('addExpenseCategory es idempotente y no pisa subcategorias previas', () => {
	const tree = addExpenseCategory({ Servicios: ['Luz', 'Agua'] }, 'Servicios')
	assert.deepEqual(tree.Servicios, ['Luz', 'Agua'])
})

test('addExpenseCategory recorta espacios e ignora nombres vacios', () => {
	const withSpaces = addExpenseCategory({ Servicios: ['Luz'] }, '  Insumos  ')
	assert.ok('Insumos' in withSpaces)

	const blank = addExpenseCategory({ Servicios: ['Luz'] }, '   ')
	assert.deepEqual(Object.keys(blank).sort(), ['Servicios'])
})

test('addIncomeCategory tambien soporta categorias vacias', () => {
	const tree = addIncomeCategory({ Pago: ['Efectivo'] }, 'Reserva')
	assert.deepEqual(tree.Reserva, [])
})

test('removeExpenseCategory elimina la categoria completa', () => {
	const tree = removeExpenseCategory(
		{ Servicios: ['Luz'], Marketing: ['Ads'] },
		'Marketing',
	)
	assert.deepEqual(Object.keys(tree), ['Servicios'])
})

test('removeIncomeCategory sobre una categoria inexistente no rompe', () => {
	const tree = removeIncomeCategory({ Pago: ['Efectivo'] }, 'Fantasma')
	assert.deepEqual(tree.Pago, ['Efectivo'])
})

test('renameExpenseCategory renombra conservando subcategorias', () => {
	const tree = renameExpenseCategory(
		{ Servicios: ['Luz', 'Agua'] },
		'Servicios',
		'Servicios basicos',
	)
	assert.ok(!('Servicios' in tree))
	assert.deepEqual(tree['Servicios basicos'], ['Luz', 'Agua'])
})

test('renameExpenseCategory fusiona cuando el destino ya existe', () => {
	const tree = renameExpenseCategory(
		{ Servicios: ['Luz'], Basicos: ['Agua'] },
		'Servicios',
		'Basicos',
	)
	assert.ok(!('Servicios' in tree))
	assert.deepEqual(tree.Basicos, ['Agua', 'Luz'])
})

test('renameIncomeCategory ignora nombres iguales o vacios', () => {
	const same = renameIncomeCategory({ Pago: ['Efectivo'] }, 'Pago', 'Pago')
	assert.deepEqual(same.Pago, ['Efectivo'])

	const blank = renameIncomeCategory({ Pago: ['Efectivo'] }, 'Pago', '   ')
	assert.deepEqual(blank.Pago, ['Efectivo'])
})

test('removeExpenseCategoryPair conserva la categoria aunque quede vacia', () => {
	const tree = removeExpenseCategoryPair({ Servicios: ['Luz'] }, 'Servicios', 'Luz')
	assert.ok('Servicios' in tree)
	assert.deepEqual(tree.Servicios, [])
})

test('removeIncomeCategoryPair elimina solo la subcategoria indicada', () => {
	const tree = removeIncomeCategoryPair(
		{ Pago: ['Efectivo', 'Tarjeta'] },
		'Pago',
		'Tarjeta',
	)
	assert.deepEqual(tree.Pago, ['Efectivo'])
})

test('upsertExpenseCategoryPair agrega una subcategoria a una categoria vacia', () => {
	const tree = upsertExpenseCategoryPair({ Marketing: [] }, 'Marketing', 'Ads')
	assert.deepEqual(tree.Marketing, ['Ads'])
})

test('upsertIncomeCategoryPair renombra una subcategoria via previous', () => {
	const tree = upsertIncomeCategoryPair(
		{ Pago: ['Efectivo'] },
		'Pago',
		'Contado',
		{ category: 'Pago', subcategory: 'Efectivo' },
	)
	assert.deepEqual(tree.Pago, ['Contado'])
})

test('expenseCategoryPairs ignora las categorias vacias', () => {
	const pairs = expenseCategoryPairs({
		Servicios: ['Luz'],
		Pendiente: [],
	})
	assert.deepEqual(pairs, [{ category: 'Servicios', subcategory: 'Luz' }])
})
