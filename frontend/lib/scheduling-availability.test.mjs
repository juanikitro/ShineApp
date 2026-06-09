import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	buildTimeSlots,
	computeReservationFormItemsDuration,
	formatCapacityLabel,
	scheduleAvailabilityForDay,
	timeToMinutes,
} from './scheduling-availability'

test('timeToMinutes parses HH:MM correctly', () => {
	assert.equal(timeToMinutes('09:30'), 9 * 60 + 30)
	assert.equal(timeToMinutes('00:00'), 0)
	assert.equal(timeToMinutes(''), null)
	assert.equal(timeToMinutes(null), null)
})

test('buildTimeSlots generates 15-minute steps between opening and closing', () => {
	const slots = buildTimeSlots({
		openingTime: '16:00',
		closingTime: '17:00',
		allowOverlap: true,
	})
	assert.deepEqual(
		slots.map((slot) => slot.value),
		['16:00', '16:15', '16:30', '16:45', '17:00'],
	)
	for (const slot of slots) {
		assert.equal(slot.disabled, false)
	}
})

test('buildTimeSlots disables slots overlapping with existing reservations', () => {
	const slots = buildTimeSlots({
		openingTime: '15:00',
		closingTime: '18:00',
		durationMinutes: 60,
		allowOverlap: false,
		occupied: [{ start_time: '16:00', duration_minutes: 60 }],
	})
	const byValue = new Map(slots.map((slot) => [slot.value, slot]))
	assert.equal(byValue.get('15:00').disabled, false)
	assert.equal(byValue.get('15:15').disabled, true)
	assert.equal(byValue.get('15:45').disabled, true)
	assert.equal(byValue.get('16:00').disabled, true)
	assert.equal(byValue.get('16:30').disabled, true)
	assert.equal(byValue.get('16:45').disabled, true)
	assert.equal(byValue.get('17:00').disabled, false)
})

test('buildTimeSlots ignores occupied when allowOverlap is true', () => {
	const slots = buildTimeSlots({
		openingTime: '16:00',
		closingTime: '18:00',
		durationMinutes: 30,
		allowOverlap: true,
		occupied: [{ start_time: '16:00', duration_minutes: 60 }],
	})
	const blockedByOverlap = slots.some(
		(slot) => slot.disabled && slot.disabledReason === 'Solapa con otra reserva',
	)
	assert.equal(blockedByOverlap, false)
})

test('computeReservationFormItemsDuration sums duration by service id and quantity', () => {
	const services = [
		{ id: 1, estimated_duration_minutes: 30 },
		{ id: 2, estimated_duration_minutes: 90 },
	]
	const items = [
		{ service: 1, quantity: 2 },
		{ service: 2, quantity: 1 },
	]
	assert.equal(computeReservationFormItemsDuration(items, services), 150)
})

test('scheduleAvailabilityForDay computes used slots per bucket', () => {
	const services = [
		{ id: 1, service_type: 'wash' },
		{ id: 2, service_type: 'detailing' },
	]
	const reservations = [
		{
			id: 10,
			day: '2026-08-12',
			service: 1,
			status: 'confirmed',
			start_time: '10:00:00',
			estimated_duration_minutes: 60,
		},
		{
			id: 11,
			day: '2026-08-12',
			service: 2,
			status: 'pending',
			start_time: '11:00:00',
			estimated_duration_minutes: 90,
		},
		{
			id: 12,
			day: '2026-08-13',
			service: 1,
			status: 'confirmed',
			start_time: '09:00:00',
			estimated_duration_minutes: 60,
		},
	]
	const result = scheduleAvailabilityForDay({
		day: '2026-08-12',
		allowOverlap: false,
		enforceCapacity: true,
		defaultCapacityWash: 4,
		defaultCapacityDetailing: 2,
		reservations,
		services,
	})
	assert.equal(result.wash.max_slots, 4)
	assert.equal(result.wash.used_slots, 1)
	assert.equal(result.wash.available_slots, 3)
	assert.equal(result.detailing.max_slots, 2)
	assert.equal(result.detailing.used_slots, 1)
	assert.equal(result.detailing.available_slots, 1)
	assert.equal(result.enforceCapacity, true)
	assert.equal(result.occupied.length, 2)
})

test('scheduleAvailabilityForDay uses global wash/detailing defaults every day', () => {
	const services = [{ id: 1, service_type: 'wash' }]
	const result = scheduleAvailabilityForDay({
		day: '2026-09-01',
		allowOverlap: false,
		enforceCapacity: true,
		defaultCapacityWash: 5,
		defaultCapacityDetailing: 3,
		reservations: [],
		services,
	})
	assert.equal(result.wash.max_slots, 5)
	assert.equal(result.detailing.max_slots, 3)
	assert.equal(result.wash.available_slots, 5)
})

test('scheduleAvailabilityForDay propagates enforceCapacity flag when limit is off', () => {
	const result = scheduleAvailabilityForDay({
		day: '2026-09-01',
		allowOverlap: false,
		enforceCapacity: false,
		defaultCapacityWash: 4,
		defaultCapacityDetailing: 2,
		reservations: [],
		services: [{ id: 1, service_type: 'wash' }],
	})
	assert.equal(result.enforceCapacity, false)
})

test('formatCapacityLabel reports used vs max', () => {
	assert.equal(
		formatCapacityLabel({ max_slots: 4, used_slots: 1, available_slots: 3 }, 'Lavado'),
		'Lavado: 1/4 ocupados',
	)
	assert.equal(
		formatCapacityLabel({ max_slots: 0, used_slots: 0, available_slots: 0 }, 'Detailing'),
		'Detailing: sin cupo definido',
	)
})
