import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	addCashPeriod,
	cashMonthEnd,
	cashMonthStart,
	cashRangeLabel,
	cashStepDays,
	cashWeekEnd,
	cashWeekStart,
} from './cash-period'

test('cashWeekStart and cashWeekEnd return monday to sunday boundaries', () => {
	assert.equal(cashWeekStart('2026-06-22'), '2026-06-22')
	assert.equal(cashWeekEnd('2026-06-22'), '2026-06-28')
	assert.equal(cashWeekStart('2026-06-28'), '2026-06-22')
	assert.equal(cashWeekEnd('2026-06-28'), '2026-06-28')
})

test('cashMonthStart and cashMonthEnd cover leap years and year changes', () => {
	assert.equal(cashMonthStart('2024-02-29'), '2024-02-01')
	assert.equal(cashMonthEnd('2024-02-29'), '2024-02-29')
	assert.equal(cashMonthStart('2026-12-15'), '2026-12-01')
	assert.equal(cashMonthEnd('2026-12-15'), '2026-12-31')
})

test('addCashPeriod steps day week and month ranges', () => {
	assert.equal(addCashPeriod('2026-01-31', 'day', 1), '2026-02-01')
	assert.equal(addCashPeriod('2026-01-31', 'week', 1), '2026-02-07')
	assert.equal(addCashPeriod('2026-01-31', 'month', 1), '2026-02-01')
	assert.equal(addCashPeriod('2026-01-15', 'month', -1), '2025-12-01')
})

test('cashStepDays and cashRangeLabel expose compact labels for the UI', () => {
	assert.equal(cashStepDays('day'), 1)
	assert.equal(cashStepDays('week'), 7)
	assert.equal(cashStepDays('month'), 1)
	assert.equal(cashRangeLabel('2026-06-24', 'day'), '2026-06-24')
	assert.match(cashRangeLabel('2026-06-24', 'week'), /22.*jun.*28.*jun/i)
	assert.match(cashRangeLabel('2026-06-24', 'month'), /1.*jun.*30.*jun/i)
})

test('cash period helpers tolerate invalid dates without throwing', () => {
	assert.match(cashMonthStart('not-a-date'), /^\d{4}-\d{2}-01$/)
})
