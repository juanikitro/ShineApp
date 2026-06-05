import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	DURATION_UNITS,
	DURATION_UNIT_OPTIONS,
	durationToMinutes,
	formatDurationLabel,
	isDurationUnit,
	minutesToDurationAmount,
	pickExactUnitForMinutes,
	readDurationDraft,
	resolveDurationUnit,
	SERVICE_DURATION_KEYS,
	writeDurationDraft,
} from './service-duration'

test('DURATION_UNITS exposes the four supported units in ascending order', () => {
	assert.deepEqual(
		DURATION_UNITS.map((unit) => unit.value),
		['minutes', 'hours', 'days', 'weeks'],
	)
	assert.deepEqual(
		DURATION_UNITS.map((unit) => unit.minutes),
		[1, 60, 1440, 10080],
	)
})

test('DURATION_UNIT_OPTIONS keeps value/label pairs for select components', () => {
	assert.deepEqual(DURATION_UNIT_OPTIONS, [
		{ value: 'minutes', label: 'Minutos' },
		{ value: 'hours', label: 'Horas' },
		{ value: 'days', label: 'Dias' },
		{ value: 'weeks', label: 'Semanas' },
	])
})

test('isDurationUnit only accepts the supported unit ids', () => {
	assert.equal(isDurationUnit('minutes'), true)
	assert.equal(isDurationUnit('weeks'), true)
	assert.equal(isDurationUnit('months'), false)
	assert.equal(isDurationUnit(null), false)
	assert.equal(isDurationUnit(undefined), false)
})

test('resolveDurationUnit falls back to minutes', () => {
	assert.equal(resolveDurationUnit('hours'), 'hours')
	assert.equal(resolveDurationUnit('invalid'), 'minutes')
	assert.equal(resolveDurationUnit(null), 'minutes')
})

test('durationToMinutes converts each unit to minutes and rounds to integer', () => {
	assert.equal(durationToMinutes(1, 'minutes'), 1)
	assert.equal(durationToMinutes('2', 'hours'), 120)
	assert.equal(durationToMinutes(1.5, 'hours'), 90)
	assert.equal(durationToMinutes('1', 'days'), 1440)
	assert.equal(durationToMinutes(2, 'weeks'), 20160)
	assert.equal(durationToMinutes(0.25, 'hours'), 15)
})

test('durationToMinutes returns null for invalid amounts', () => {
	assert.equal(durationToMinutes('', 'hours'), null)
	assert.equal(durationToMinutes(null, 'hours'), null)
	assert.equal(durationToMinutes('abc', 'hours'), null)
})

test('durationToMinutes clamps negatives to zero', () => {
	assert.equal(durationToMinutes(-5, 'minutes'), 0)
})

test('pickExactUnitForMinutes returns the largest exact unit', () => {
	assert.deepEqual(pickExactUnitForMinutes(60), { amount: 1, unit: 'hours' })
	assert.deepEqual(pickExactUnitForMinutes(90), { amount: 90, unit: 'minutes' })
	assert.deepEqual(pickExactUnitForMinutes(1440), { amount: 1, unit: 'days' })
	assert.deepEqual(pickExactUnitForMinutes(10080), { amount: 1, unit: 'weeks' })
	assert.deepEqual(pickExactUnitForMinutes(20160), { amount: 2, unit: 'weeks' })
	assert.deepEqual(pickExactUnitForMinutes(2880), { amount: 2, unit: 'days' })
})

test('pickExactUnitForMinutes handles edge cases', () => {
	assert.deepEqual(pickExactUnitForMinutes(0), { amount: 0, unit: 'minutes' })
	assert.deepEqual(pickExactUnitForMinutes(null), { amount: 0, unit: 'minutes' })
	assert.deepEqual(pickExactUnitForMinutes('45'), { amount: 45, unit: 'minutes' })
})

test('minutesToDurationAmount expresses minutes in the requested unit', () => {
	assert.equal(minutesToDurationAmount(120, 'hours'), 2)
	assert.equal(minutesToDurationAmount(90, 'hours'), 1.5)
	assert.equal(minutesToDurationAmount(10080, 'weeks'), 1)
	assert.equal(minutesToDurationAmount(60, 'minutes'), 60)
	assert.equal(minutesToDurationAmount('', 'hours'), null)
})

test('formatDurationLabel renders compact natural-language labels', () => {
	assert.equal(formatDurationLabel(45), '45 min')
	assert.equal(formatDurationLabel(60), '1 h')
	assert.equal(formatDurationLabel(90), '1 h 30 min')
	assert.equal(formatDurationLabel(1440), '1 d')
	assert.equal(formatDurationLabel(1500), '1 d 1 h')
	assert.equal(formatDurationLabel(10080), '1 sem')
	assert.equal(formatDurationLabel(10800), '1 sem 12 h')
	assert.equal(formatDurationLabel(20160), '2 sem')
})

test('formatDurationLabel returns null when there is nothing to show', () => {
	assert.equal(formatDurationLabel(0), null)
	assert.equal(formatDurationLabel(null), null)
	assert.equal(formatDurationLabel(''), null)
	assert.equal(formatDurationLabel('abc'), null)
})

test('readDurationDraft uses the largest exact unit when there is no stored unit', () => {
	assert.deepEqual(
		readDurationDraft({ estimated_duration_minutes: 60 }),
		{ amount: '1', unit: 'hours' },
	)
	assert.deepEqual(
		readDurationDraft({ estimated_duration_minutes: '90' }),
		{ amount: '90', unit: 'minutes' },
	)
	assert.deepEqual(
		readDurationDraft({ estimated_duration_minutes: 10080 }),
		{ amount: '1', unit: 'weeks' },
	)
})

test('readDurationDraft honors a unit already present in the form', () => {
	const form = {
		estimated_duration_minutes: '90',
		estimated_duration_unit: 'hours',
	}
	assert.deepEqual(readDurationDraft(form), { amount: '1.5', unit: 'hours' })
})

test('readDurationDraft tolerates missing values', () => {
	assert.deepEqual(readDurationDraft({}), { amount: '', unit: 'minutes' })
	assert.deepEqual(readDurationDraft(null), { amount: '', unit: 'minutes' })
})

test('writeDurationDraft updates the unit and recomputes minutes', () => {
	const initial = {
		estimated_duration_minutes: '60',
	}
	const after = writeDurationDraft(initial, { unit: 'hours' })
	assert.equal(after.estimated_duration_unit, 'hours')
	assert.equal(after.estimated_duration_minutes, '60')

	const switched = writeDurationDraft(after, { amount: '2' })
	assert.equal(switched.estimated_duration_unit, 'hours')
	assert.equal(switched.estimated_duration_minutes, '120')

	const inWeeks = writeDurationDraft(switched, { amount: '1', unit: 'weeks' })
	assert.equal(inWeeks.estimated_duration_unit, 'weeks')
	assert.equal(inWeeks.estimated_duration_minutes, '10080')
})

test('writeDurationDraft preserves other form keys', () => {
	const form = { name: 'Lavado', estimated_duration_minutes: '60' }
	const next = writeDurationDraft(form, { amount: '1', unit: 'days' })
	assert.equal(next.name, 'Lavado')
	assert.equal(next.estimated_duration_minutes, '1440')
	assert.equal(next.estimated_duration_unit, 'days')
})

test('writeDurationDraft accepts custom keys', () => {
	const form = { duracion: '60' }
	const next = writeDurationDraft(
		form,
		{ amount: '2', unit: 'hours' },
		{ minutesKey: 'duracion', unitKey: 'unidad' },
	)
	assert.equal(next.duracion, '120')
	assert.equal(next.unidad, 'hours')
})

test('SERVICE_DURATION_KEYS targets the catalog payload field', () => {
	assert.equal(SERVICE_DURATION_KEYS.minutesKey, 'estimated_duration_minutes')
	assert.equal(SERVICE_DURATION_KEYS.unitKey, 'estimated_duration_unit')
})
