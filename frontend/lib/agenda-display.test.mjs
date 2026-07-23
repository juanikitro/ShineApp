import assert from 'node:assert/strict'
import { test } from 'vitest'

import { formatDayLabel } from './page-support'

import {
	agendaMonthChipClass,
	agendaMonthChipLabel,
	agendaSectorSelectOptions,
	createQuoteTentativeTimeLabel,
	quoteTentativeTimeLabel,
	reservationAgendaServices,
	reservationExitTimeLabel,
	reservationRangeLabel,
	reservationSelectOptions,
	reservationShowsWork,
	reservationStartTimeLabel,
	reservationVehicleModel,
} from './agenda-display'

test('matches reservation vehicles across numeric and string identifiers', () => {
	assert.equal(
		reservationVehicleModel(
			{ vehicle: '2' },
			[
				{ id: 1, brand: 'Toyota', model: 'Etios' },
				{ id: 2, brand: ' Ford ', model: ' Focus ' },
			],
		),
		'Ford Focus',
	)
})

test('formats agenda month chip labels with times and existing fallbacks', () => {
	assert.equal(
		agendaMonthChipLabel({
			reservation: {
				start_time: '09:30:00',
				customer_name: 'Ana',
			},
		}),
		'09:30 Ana',
	)
	assert.equal(
		agendaMonthChipLabel({
			reservation: {
				start_time: '',
				customer_name: null,
				vehicle_label: 'Hilux',
			},
		}),
		'Hilux',
	)
	assert.equal(agendaMonthChipLabel({ reservation: {} }), 'Reserva')
})

test('formats agenda month chip classes from reservation statuses', () => {
	assert.equal(
		agendaMonthChipClass({ reservation: { status: 'in_progress' } }),
		'agenda-month-chip--in-progress',
	)
	assert.equal(agendaMonthChipClass({ reservation: { status: '' } }), '')
	assert.equal(agendaMonthChipClass({ reservation: {} }), '')
})

test('agendaSectorSelectOptions keeps active sectors and their existing string labels', () => {
	assert.deepEqual(
		agendaSectorSelectOptions([
			{ id: 1, name: 'Lavado', is_active: true },
			{ id: 2, name: 'Inactivo', is_active: false },
			{ id: 3, name: null },
			{ id: 4, name: 'Valor no booleano', is_active: 'false' },
		]),
		[
			{ value: '1', label: 'Lavado' },
			{ value: '3', label: '' },
			{ value: '4', label: 'Valor no booleano' },
		],
	)
})

test('returns the available vehicle text or an empty string when unmatched', () => {
	assert.equal(
		reservationVehicleModel({ vehicle: 4 }, [{ id: 4, brand: 'Fiat', model: '' }]),
		'Fiat',
	)
	assert.equal(
		reservationVehicleModel({ vehicle: 99 }, [{ id: 4, brand: 'Fiat', model: 'Uno' }]),
		'',
	)
})

test('formats the reservation start time when times are enabled', () => {
	assert.equal(
		reservationStartTimeLabel({ start_time: '09:30:00' }, true, 'Sin hora'),
		'09:30',
	)
})

test('uses the fallback when an enabled reservation has no valid start time', () => {
	assert.equal(
		reservationStartTimeLabel({ start_time: '09:3' }, true, 'Sin hora'),
		'Sin hora',
	)
	assert.equal(reservationStartTimeLabel(null, true, 'Sin hora'), 'Sin hora')
})

test('hides start times when reservation times are disabled', () => {
	assert.equal(
		reservationStartTimeLabel({ start_time: '09:30:00' }, false, 'Sin hora'),
		'',
	)
})

test('formats the reservation exit time when times are enabled', () => {
	assert.equal(
		reservationExitTimeLabel({ exit_time: '14:45:00' }, true),
		'14:45',
	)
})

test('returns an empty exit time for missing or invalid values', () => {
	assert.equal(reservationExitTimeLabel({ exit_time: '14:4' }, true), '')
	assert.equal(reservationExitTimeLabel(null, true), '')
})

test('hides exit times when reservation times are disabled', () => {
	assert.equal(
		reservationExitTimeLabel({ exit_time: '14:45:00' }, false),
		'',
	)
})

test('reservationSelectOptions preserves canceled filtering, time labels and metadata', () => {
	const reservations = [
		{
			id: 1,
			status: 'confirmed',
			day: '2026-07-23',
			start_time: '09:30:00',
			customer_name: 'Ana',
			vehicle_label: 'Fiesta',
			service_name: 'Lavado',
		},
		{ id: 2, status: 'canceled', day: '2026-07-24' },
		{
			id: 3,
			status: 'Canceled',
			day: '2026-07-25',
			customer_name: 'Beto',
			vehicle_label: 'Hilux',
			service_name: 'Interior',
		},
	]
	const labels = { confirmed: 'Confirmada' }

	assert.deepEqual(reservationSelectOptions(reservations, true, labels), [
		{
			value: '1',
			label: '2026-07-23 09:30 - Ana',
			meta: 'Fiesta - Lavado - Confirmada',
		},
		{
			value: '3',
			label: '2026-07-25 Sin hora - Beto',
			meta: 'Hilux - Interior - Canceled',
		},
	])
	assert.equal(
		reservationSelectOptions(reservations, false, labels)[0].label,
		'2026-07-23 - Ana',
	)
})

test('formats enabled tentative quote times with the existing leading space', () => {
	assert.equal(quoteTentativeTimeLabel('09:30:00', true), ' 09:30')
})

test('returns no tentative quote time for empty or invalid values', () => {
	assert.equal(quoteTentativeTimeLabel('09:3', true), '')
	assert.equal(quoteTentativeTimeLabel(null, true), '')
})

test('hides tentative quote times when reservation times are disabled', () => {
	assert.equal(quoteTentativeTimeLabel('09:30:00', false), '')
})

test('createQuoteTentativeTimeLabel keeps the active time setting bound to its callback', () => {
	assert.equal(createQuoteTentativeTimeLabel(true)('09:30:00'), ' 09:30')
	assert.equal(createQuoteTentativeTimeLabel(false)('09:30:00'), '')
})

test('shows work only for non-blocking reservation statuses with a work order', () => {
	const workOrder = { id: 7 }

	assert.equal(reservationShowsWork({ status: 'pending' }, workOrder), false)
	assert.equal(reservationShowsWork({ status: 'canceled' }, workOrder), false)
	assert.equal(reservationShowsWork({ status: 'confirmed' }, workOrder), true)
	assert.equal(reservationShowsWork({ status: 'Pending' }, workOrder), true)
})

test('hides work when there is no work-order record', () => {
	assert.equal(reservationShowsWork({ status: 'confirmed' }, null), false)
	assert.equal(reservationShowsWork({ status: 'confirmed' }, undefined), false)
})

test('builds agenda service lines from reservation item details', () => {
	assert.deepEqual(
		reservationAgendaServices({
			items: [
				{
					id: 7,
					service_icon: '🧽',
					service_name: 'Lavado premium',
				},
				{ service: 9, description: 'Interior completo' },
			],
		}),
		[
			{ key: '7', name: '🧽 Lavado premium' },
			{ key: '9', name: 'Interior completo' },
		],
	)
})

test('falls back to the reservation service text when item lines are empty', () => {
	assert.deepEqual(
		reservationAgendaServices({
			items: [{ id: 1, service_name: '   ' }],
			service_name: 'Lavado, Interior completo, ',
		}),
		[
			{ key: 'Lavado-0', name: 'Lavado' },
			{ key: 'Interior completo-1', name: 'Interior completo' },
		],
	)
})

test('returns no agenda service lines for an empty reservation service value', () => {
	assert.deepEqual(reservationAgendaServices({ service_name: '' }), [])
})

test('returns no range label without an entry day', () => {
	assert.equal(
		reservationRangeLabel(
			{ exit_day: '2026-07-11', exit_time: '14:45:00' },
			true,
		),
		'',
	)
})

test('uses the existing same-day exit label behavior', () => {
	assert.equal(
		reservationRangeLabel(
			{
				day: '2026-07-10',
				exit_day: '2026-07-10',
				exit_time: '14:45:00',
			},
			true,
		),
		'Egreso 14:45',
	)
	assert.equal(
		reservationRangeLabel(
			{ day: '2026-07-10', exit_time: '14:45:00' },
			false,
		),
		'',
	)
})

test('formats extended ranges with and without reservation times', () => {
	const entryDay = formatDayLabel('2026-07-10')
	const exitDay = formatDayLabel('2026-07-11')
	const reservation = {
		day: '2026-07-10',
		exit_day: '2026-07-11',
		start_time: '09:10:00',
		exit_time: '17:20:00',
	}

	assert.equal(
		reservationRangeLabel(reservation, true),
		`Ingresa ${entryDay} 09:10 - Egresa ${exitDay} 17:20`,
	)
	assert.equal(
		reservationRangeLabel(reservation, false),
		`Ingresa ${entryDay} - Egresa ${exitDay}`,
	)
})
