import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	agendaServiceBucketForReservation,
	buildAgendaOperationalRows,
	buildAgendaCalendarSegments,
	buildWorkOrderByReservation,
	filterAgendaReservationsByBucket,
} from './agenda'

test('builds one visual segment for a reservation spanning three visible days', () => {
	const segments = buildAgendaCalendarSegments(
		[
			{
				id: 7,
				day: '2026-05-07',
				exit_day: '2026-05-09',
				start_time: '10:00:00',
				customer_name: 'Juan Perez',
				status: 'confirmed',
			},
		],
		[],
		[
			'2026-05-07',
			'2026-05-08',
			'2026-05-09',
			'2026-05-10',
			'2026-05-11',
		],
		{ showStayDays: true },
	)

	assert.equal(segments.length, 1)
	assert.equal(segments[0].reservation.id, 7)
	assert.equal(segments[0].startColumn, 1)
	assert.equal(segments[0].spanDays, 3)
	assert.equal(segments[0].stackRow, 1)
	assert.equal(segments[0].row.phase, 'entry')
	assert.equal(segments[0].row.day, '2026-05-07')
})

test('places overlapping visual segments on separate rows', () => {
	const segments = buildAgendaCalendarSegments(
		[
			{
				id: 7,
				day: '2026-05-07',
				exit_day: '2026-05-09',
				start_time: '10:00:00',
				customer_name: 'Juan Perez',
				status: 'confirmed',
			},
			{
				id: 8,
				day: '2026-05-08',
				exit_day: '2026-05-10',
				start_time: '15:00:00',
				customer_name: 'Ana Perez',
				status: 'pending',
			},
		],
		[],
		[
			'2026-05-07',
			'2026-05-08',
			'2026-05-09',
			'2026-05-10',
			'2026-05-11',
		],
		{ showStayDays: true },
	)

	assert.deepEqual(
		segments.map((segment) => ({
			id: segment.reservation.id,
			startColumn: segment.startColumn,
			spanDays: segment.spanDays,
			stackRow: segment.stackRow,
		})),
		[
			{ id: 7, startColumn: 1, spanDays: 3, stackRow: 1 },
			{ id: 8, startColumn: 2, spanDays: 3, stackRow: 2 },
		],
	)
})

test('assigns agenda reservations to wash or detailing by primary service type', () => {
	const serviceTypes = {
		1: 'wash',
		2: 'detailing',
		3: 'combo',
	}
	const reservations = [
		{ id: 10, service: 1, items: [{ service: 2 }] },
		{ id: 11, service: 2, items: [{ service: 2 }] },
		{ id: 12, service: 3, items: [{ service: 3 }] },
		{ id: 13, items: [{ service: 2 }] },
		{ id: 14, service: 999 },
	]

	assert.equal(
		agendaServiceBucketForReservation(reservations[0], serviceTypes),
		'wash',
	)
	assert.equal(
		agendaServiceBucketForReservation(reservations[1], serviceTypes),
		'detailing',
	)
	assert.equal(
		agendaServiceBucketForReservation(reservations[2], serviceTypes),
		'wash',
	)
	assert.equal(
		agendaServiceBucketForReservation(reservations[3], serviceTypes),
		'detailing',
	)
	assert.equal(
		agendaServiceBucketForReservation(reservations[4], serviceTypes),
		'wash',
	)

	assert.deepEqual(
		filterAgendaReservationsByBucket(reservations, serviceTypes, 'wash').map(
			(item) => item.id,
		),
		[10, 12, 14],
	)
	assert.deepEqual(
		filterAgendaReservationsByBucket(
			reservations,
			serviceTypes,
			'detailing',
		).map((item) => item.id),
		[11, 13],
	)
})

test('renders a multi-day reservation only on its entry day when stay days are disabled', () => {
	const segments = buildAgendaCalendarSegments(
		[
			{
				id: 7,
				day: '2026-05-07',
				exit_day: '2026-05-09',
				start_time: '10:00:00',
				customer_name: 'Juan Perez',
				status: 'confirmed',
			},
		],
		[],
		[
			'2026-05-07',
			'2026-05-08',
			'2026-05-09',
			'2026-05-10',
			'2026-05-11',
		],
		{ showStayDays: false },
	)

	assert.equal(segments.length, 1)
	assert.equal(segments[0].startColumn, 1)
	assert.equal(segments[0].spanDays, 1)
	assert.equal(segments[0].endDay, '2026-05-07')
})

test('buildWorkOrderByReservation accepts direct, nested and primitive reservation references', () => {
	const byReservation = buildWorkOrderByReservation([
		{ id: 1, reservation_id: 10 },
		{ id: 2, reservation: { id: 11 } },
		{ id: 3, reservation: 12 },
		{ id: 4, reservation_id: '' },
		{ id: 5, reservation: null },
	])

	assert.deepEqual(Object.keys(byReservation).sort(), ['10', '11', '12'])
	assert.equal(byReservation[10].id, 1)
	assert.equal(byReservation[11].id, 2)
	assert.equal(byReservation[12].id, 3)
})

test('buildAgendaOperationalRows expands entry stay and exit days with work-order context', () => {
	const rows = buildAgendaOperationalRows(
		[
			{
				id: 7,
				day: '2026-05-07',
				exit_day: '2026-05-09',
				start_time: '11:00',
			},
			{
				id: 8,
				day: '2026-05-07',
				exit_day: '2026-05-07',
				start_time: '09:00',
				work_order: { id: 88 },
			},
			{ id: null, day: '2026-05-07' },
			{ id: 9, day: '' },
		],
		[{ id: 77, reservation_id: 7 }],
		['2026-05-07', '2026-05-08', '2026-05-09', '2026-05-10'],
	)

	assert.deepEqual(
		rows['2026-05-07'].map((row) => ({
			id: row.reservation.id,
			phase: row.phase,
			kind: row.kind,
			workOrderId: row.workOrder.id,
		})),
		[
			{
				id: 8,
				phase: 'entry',
				kind: 'reservation-work-order',
				workOrderId: 88,
			},
			{
				id: 7,
				phase: 'entry',
				kind: 'reservation-work-order',
				workOrderId: 77,
			},
		],
	)
	assert.equal(rows['2026-05-08'][0].phase, 'stay')
	assert.equal(rows['2026-05-09'][0].phase, 'exit')
	assert.equal(rows['2026-05-10'], undefined)
})

test('buildAgendaOperationalRows can hide stay days and falls back when exit is before entry', () => {
	const rows = buildAgendaOperationalRows(
		[
			{
				id: 1,
				day: '2026-05-10',
				exit_day: '2026-05-08',
				start_time: '',
			},
			{
				id: 2,
				day: '2026-05-09',
				exit_day: '2026-05-11',
				start_time: 'bad',
			},
		],
		[],
		['2026-05-09', '2026-05-10', '2026-05-11'],
		{ showStayDays: false },
	)

	assert.deepEqual(Object.keys(rows).sort(), ['2026-05-09', '2026-05-10'])
	assert.equal(rows['2026-05-09'][0].reservation.id, 2)
	assert.equal(rows['2026-05-10'][0].reservation.id, 1)
	assert.equal(rows['2026-05-10'][0].phase, 'entry')
})

test('buildAgendaCalendarSegments clips reservations to the visible window and reuses rows when they do not overlap', () => {
	const segments = buildAgendaCalendarSegments(
		[
			{
				id: 1,
				day: '2026-05-01',
				exit_day: '2026-05-08',
				start_time: '08:00',
			},
			{
				id: 2,
				day: '2026-05-09',
				exit_day: '2026-05-20',
				start_time: '07:00',
			},
		],
		[{ id: 50, reservation: { id: 2 } }],
		['2026-05-07', '2026-05-08', '2026-05-09', '2026-05-10'],
		{ showStayDays: true },
	)

	assert.deepEqual(
		segments.map((segment) => ({
			id: segment.reservation.id,
			startDay: segment.startDay,
			endDay: segment.endDay,
			startColumn: segment.startColumn,
			spanDays: segment.spanDays,
			stackRow: segment.stackRow,
			before: segment.startsBeforeWindow,
			after: segment.endsAfterWindow,
			phase: segment.row.phase,
			workOrderId: segment.workOrder?.id ?? null,
		})),
		[
			{
				id: 1,
				startDay: '2026-05-07',
				endDay: '2026-05-08',
				startColumn: 1,
				spanDays: 2,
				stackRow: 1,
				before: true,
				after: false,
				phase: 'stay',
				workOrderId: null,
			},
			{
				id: 2,
				startDay: '2026-05-09',
				endDay: '2026-05-10',
				startColumn: 3,
				spanDays: 2,
				stackRow: 1,
				before: false,
				after: true,
				phase: 'entry',
				workOrderId: 50,
			},
		],
	)
})

test('buildAgendaCalendarSegments skips empty windows, malformed reservations and out-of-window segments', () => {
	assert.deepEqual(buildAgendaCalendarSegments([], [], []), [])
	assert.deepEqual(
		buildAgendaCalendarSegments(
			[
				{ id: '', day: '2026-05-07' },
				{ id: 1, day: '' },
				{ id: 2, day: '2026-05-01', exit_day: '2026-05-02' },
				{ id: 3, day: '2026-05-20', exit_day: '2026-05-21' },
			],
			[],
			['2026-05-07', '2026-05-08'],
		),
		[],
	)
})
