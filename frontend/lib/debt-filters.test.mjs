import assert from 'node:assert/strict'
import { test } from 'vitest'

import { debtMatchesFilters, hasDebtFilters } from './debt-filters'

const baseDebt = {
	status: 'pending',
	balance_due: '500',
	concept: 'Alquiler',
	creditor: 'Propietario',
	supplier_name: null,
	expense_category: 'arriendos',
	expense_subcategory: '',
	notes: '',
	principal_amount: '500',
	total_paid: '0',
}

// debtMatchesFilters
test('debtMatchesFilters returns true with empty filters and query', () => {
	assert.equal(debtMatchesFilters(baseDebt, {}, ''), true)
})

test('debtMatchesFilters filters by status', () => {
	assert.equal(debtMatchesFilters(baseDebt, { status: 'paid' }, ''), false)
	assert.equal(debtMatchesFilters(baseDebt, { status: 'pending' }, ''), true)
})

test('debtMatchesFilters filters by balance open (balance_due > 0)', () => {
	assert.equal(debtMatchesFilters(baseDebt, { balance: 'open' }, ''), true)
	assert.equal(debtMatchesFilters({ ...baseDebt, balance_due: '0' }, { balance: 'open' }, ''), false)
})

test('debtMatchesFilters filters by balance settled (balance_due = 0)', () => {
	assert.equal(debtMatchesFilters(baseDebt, { balance: 'settled' }, ''), false)
	assert.equal(debtMatchesFilters({ ...baseDebt, balance_due: '0' }, { balance: 'settled' }, ''), true)
})

test('debtMatchesFilters returns true for empty query', () => {
	assert.equal(debtMatchesFilters(baseDebt, {}, ''), true)
})

test('debtMatchesFilters matches query against concept', () => {
	assert.equal(debtMatchesFilters(baseDebt, {}, 'alquiler'), true)
	assert.equal(debtMatchesFilters(baseDebt, {}, 'ABC_NO_MATCH'), false)
})

test('debtMatchesFilters matches query against creditor', () => {
	assert.equal(debtMatchesFilters(baseDebt, {}, 'propietario'), true)
})

test('debtMatchesFilters matches query against expense_category', () => {
	assert.equal(debtMatchesFilters(baseDebt, {}, 'arriendos'), true)
})

test('debtMatchesFilters is case-insensitive', () => {
	assert.equal(debtMatchesFilters(baseDebt, {}, 'ALQUILER'), true)
})

// hasDebtFilters
test('hasDebtFilters returns false when all values are empty', () => {
	assert.equal(hasDebtFilters({ status: '', balance: '' }), false)
	assert.equal(hasDebtFilters({}), false)
})

test('hasDebtFilters returns true when any filter is set', () => {
	assert.equal(hasDebtFilters({ status: 'pending' }), true)
	assert.equal(hasDebtFilters({ balance: 'open' }), true)
})
