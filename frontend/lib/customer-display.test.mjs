import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	customerDaysText,
	customerDaysAgoText,
	customerAverageGapText,
	formatTimeLabel,
	customerScheduleLabel,
	customerListInsights,
} from './customer-display'

// customerDaysText
test('customerDaysText returns emptyText for non-finite values', () => {
	assert.equal(customerDaysText('abc'), 'Sin dato')
	assert.equal(customerDaysText(NaN), 'Sin dato')
	assert.equal(customerDaysText(Infinity), 'Sin dato')
})

test('customerDaysText returns custom emptyText for non-finite', () => {
	assert.equal(customerDaysText('abc', 'Desconocido'), 'Desconocido')
})

test('customerDaysText returns Hoy for 0', () => {
	assert.equal(customerDaysText(0), 'Hoy')
})

test('customerDaysText returns 1 dia for 1', () => {
	assert.equal(customerDaysText(1), '1 dia')
})

test('customerDaysText returns n dias for n > 1', () => {
	assert.equal(customerDaysText(5), '5 dias')
	assert.equal(customerDaysText(30), '30 dias')
})

// customerDaysAgoText
test('customerDaysAgoText returns emptyText as-is for non-finite', () => {
	assert.equal(customerDaysAgoText('abc'), 'Sin dato')
	assert.equal(customerDaysAgoText(NaN), 'Sin dato')
})

test('customerDaysAgoText returns Hoy as-is', () => {
	assert.equal(customerDaysAgoText(0), 'Hoy')
})

test('customerDaysAgoText prepends Hace for day counts', () => {
	assert.equal(customerDaysAgoText(1), 'Hace 1 dia')
	assert.equal(customerDaysAgoText(7), 'Hace 7 dias')
})

// customerAverageGapText
test('customerAverageGapText returns no history for non-finite', () => {
	assert.equal(customerAverageGapText('abc'), 'Sin suficiente historial')
	assert.equal(customerAverageGapText(NaN), 'Sin suficiente historial')
	assert.equal(customerAverageGapText(Infinity), 'Sin suficiente historial')
})

test('customerAverageGapText returns same day for 0', () => {
	assert.equal(customerAverageGapText(0), 'Visitas el mismo dia')
})

test('customerAverageGapText returns singular form for 1', () => {
	assert.equal(customerAverageGapText(1), '1 dia promedio entre visitas')
})

test('customerAverageGapText returns plural form for n > 1', () => {
	assert.equal(customerAverageGapText(14), '14 dias promedio entre visitas')
})

// formatTimeLabel
test('formatTimeLabel returns first 5 chars for strings long enough', () => {
	assert.equal(formatTimeLabel('10:30:00'), '10:30')
	assert.equal(formatTimeLabel('09:00'), '09:00')
})

test('formatTimeLabel returns empty string for short strings', () => {
	assert.equal(formatTimeLabel('10:3'), '')
	assert.equal(formatTimeLabel(''), '')
	assert.equal(formatTimeLabel(null), '')
})

// customerScheduleLabel
test('customerScheduleLabel returns Sin reserva futura when reservation is null', () => {
	assert.equal(customerScheduleLabel(null), 'Sin reserva futura')
	assert.equal(customerScheduleLabel(undefined), 'Sin reserva futura')
})

test('customerScheduleLabel returns Sin reserva futura when day is missing', () => {
	assert.equal(customerScheduleLabel({ start_time: '10:00' }), 'Sin reserva futura')
})

test('customerScheduleLabel formats date without time when showReservationTimes is false', () => {
	const label = customerScheduleLabel({ day: '2025-06-15' }, false)
	assert.ok(!label.includes(':'))
})

test('customerScheduleLabel formats date with time when start_time present and showReservationTimes true', () => {
	const label = customerScheduleLabel({ day: '2025-06-15', start_time: '10:30:00' }, true)
	assert.ok(label.includes('10:30'))
})

test('customerScheduleLabel formats date without time when start_time is missing', () => {
	const label = customerScheduleLabel({ day: '2025-06-15' }, true)
	assert.ok(!label.includes('10:30'))
})

// customerListInsights
test('customerListInsights returns list_insights when present', () => {
	const insights = { last_visit: '2025-01-01' }
	assert.deepEqual(customerListInsights({ list_insights: insights }), insights)
})

test('customerListInsights returns empty object when missing', () => {
	assert.deepEqual(customerListInsights({}), {})
	assert.deepEqual(customerListInsights(null), {})
})
