import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	blankFixedExpenseForm,
	fixedExpenseIntervalOptions,
} from './page-support'

test('blankFixedExpenseForm scaffolds a recurring expense draft', () => {
	const form = blankFixedExpenseForm('2026-06-10')
	assert.equal(form.concept, '')
	assert.equal(form.amount, '')
	assert.equal(form.start_date, '2026-06-10')
	assert.equal(form.interval_unit, 'months')
	assert.equal(form.interval_count, '1')
	assert.equal(form.due_offset_days, '0')
	assert.equal(form.end_date, '')
	assert.equal(form.max_cycles, '')
	assert.equal(form.auto_pay, false)
	assert.equal(form.payment_method, 'transfer')
	assert.equal(form.expense_category, 'Servicios')
	assert.equal(form.expense_subcategory, 'Otros')
})

test('fixedExpenseIntervalOptions exposes weeks and months cadences', () => {
	assert.deepEqual(
		fixedExpenseIntervalOptions.map((option) => option.value),
		['weeks', 'months'],
	)
})
