import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	blankDebtForm,
	recurringDebtIntervalLabels,
	recurringDebtIntervalOptions,
} from './page-support'

test('blankDebtForm includes recurring scaffolding with safe defaults', () => {
	const form = blankDebtForm('2026-06-05')
	assert.equal(form.origin_date, '2026-06-05')
	assert.equal(form.is_recurring, false)
	assert.equal(form.interval_unit, 'months')
	assert.equal(form.interval_count, '1')
	assert.equal(form.due_offset_days, '0')
	assert.equal(form.end_date, '')
	assert.equal(form.max_cycles, '')
	assert.equal(form.auto_settle, false)
	assert.equal(form.auto_settle_method, 'transfer')
})

test('recurringDebtIntervalOptions mirrors label map in stable order', () => {
	assert.deepEqual(
		recurringDebtIntervalOptions.map((opt) => opt.value),
		Object.keys(recurringDebtIntervalLabels),
	)
})
