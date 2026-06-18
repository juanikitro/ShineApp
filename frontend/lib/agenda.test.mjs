import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	agendaSectorForReservation,
	buildAgendaMonthGrid,
	buildAgendaOperationalRows,
	buildAgendaCalendarSegments,
	buildWorkOrderByReservation,
	filterAgendaReservationsBySector,
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

test('filters reservations by sector id using reservation.sector field', () => {
	const reservations = [
		{ id: 10, sector: 1 },
		{ id: 11, sector: 2 },
		{ id: 12, sector: 1 },
		{ id: 13, sector: null },
		{ id: 14 },
	]

	assert.equal(agendaSectorForReservation(reservations[0]), 1)
	assert.equal(agendaSectorForReservation(reservations[1]), 2)
	assert.equal(agendaSectorForReservation(reservations[3]), null)
	assert.equal(agendaSectorForReservation(reservations[4]), null)

	assert.deepEqual(
		filterAgendaReservationsBySector(reservations, 1).map((r) => r.id),
		[10, 12],
	)
	assert.deepEqual(
		filterAgendaReservationsBySector(reservations, 2).map((r) => r.id),
		[11],
	)
	assert.deepEqual(
		filterAgendaReservationsBySector(reservations, null).map((r) => r.id),
		[10, 11, 12, 13, 14],
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

test('buildAgendaMonthGrid covers full weeks with leading and trailing padding', () => {
	// Junio 2026: 1 de junio es lunes, 30 de junio es martes.
	const grid = buildAgendaMonthGrid([], [], '2026-06-18', {
		weekStartsOn: 1,
		today: '2026-06-18',
	})

	assert.equal(grid.monthStart, '2026-06-01')
	assert.equal(grid.monthEnd, '2026-06-30')
	assert.equal(grid.weeks.length, 5)
	grid.weeks.forEach((week) => assert.equal(week.days.length, 7))
	assert.equal(grid.weeks[0].days[0].isoDate, '2026-06-01')
	assert.equal(grid.weeks[0].days[0].inCurrentMonth, true)
	const lastWeek = grid.weeks[grid.weeks.length - 1]
	assert.equal(lastWeek.days[0].isoDate, '2026-06-29')
	assert.equal(lastWeek.days[1].isoDate, '2026-06-30')
	assert.equal(lastWeek.days[2].isoDate, '2026-07-01')
	assert.equal(lastWeek.days[2].inCurrentMonth, false)

	const todayCell = grid.weeks
		.flatMap((week) => week.days)
		.find((cell) => cell.isToday)
	assert.equal(todayCell.isoDate, '2026-06-18')
})

test('buildAgendaMonthGrid can start weeks on Sunday and pads accordingly', () => {
	const grid = buildAgendaMonthGrid([], [], '2026-06-01', { weekStartsOn: 0 })
	assert.equal(grid.weeks[0].days[0].isoDate, '2026-05-31')
	assert.equal(grid.weeks[0].days[0].inCurrentMonth, false)
	assert.equal(grid.weeks[0].days[1].isoDate, '2026-06-01')
})

test('buildAgendaMonthGrid places a multi-day reservation on every crossed day', () => {
	const grid = buildAgendaMonthGrid(
		[
			{
				id: 7,
				day: '2026-06-09',
				exit_day: '2026-06-11',
				start_time: '10:00:00',
				status: 'confirmed',
			},
		],
		[{ id: 70, reservation_id: 7 }],
		'2026-06-15',
		{ showStayDays: true, today: '2026-06-15' },
	)

	const cells = Object.fromEntries(
		grid.weeks.flatMap((week) => week.days).map((cell) => [cell.isoDate, cell]),
	)

	assert.equal(cells['2026-06-09'].count, 1)
	assert.equal(cells['2026-06-09'].chips[0].phase, 'entry')
	assert.equal(cells['2026-06-09'].chips[0].workOrder.id, 70)
	assert.equal(cells['2026-06-10'].chips[0].phase, 'stay')
	assert.equal(cells['2026-06-11'].chips[0].phase, 'exit')
	assert.equal(cells['2026-06-12'].count, 0)
})

test('buildAgendaMonthGrid keeps entry day only when stay days are disabled', () => {
	const grid = buildAgendaMonthGrid(
		[{ id: 7, day: '2026-06-09', exit_day: '2026-06-11', start_time: '10:00' }],
		[],
		'2026-06-15',
		{ showStayDays: false },
	)
	const cells = Object.fromEntries(
		grid.weeks.flatMap((week) => week.days).map((cell) => [cell.isoDate, cell]),
	)
	assert.equal(cells['2026-06-09'].count, 1)
	assert.equal(cells['2026-06-10'].count, 0)
	assert.equal(cells['2026-06-11'].count, 0)
})

test('buildAgendaMonthGrid sorts chips by start time and reports overflow', () => {
	const grid = buildAgendaMonthGrid(
		[
			{ id: 1, day: '2026-06-10', start_time: '15:00' },
			{ id: 2, day: '2026-06-10', start_time: '08:30' },
			{ id: 3, day: '2026-06-10', start_time: '11:00' },
			{ id: 4, day: '2026-06-10', start_time: '17:00' },
		],
		[],
		'2026-06-10',
		{ chipLimit: 2 },
	)
	const cell = grid.weeks
		.flatMap((week) => week.days)
		.find((item) => item.isoDate === '2026-06-10')

	assert.equal(cell.count, 4)
	assert.deepEqual(
		cell.chips.map((chip) => chip.reservation.id),
		[2, 3],
	)
	assert.equal(cell.overflowCount, 2)
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
