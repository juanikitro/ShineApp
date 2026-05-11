import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadAgendaModule() {
	const sourcePath = resolve('lib/agenda.ts')
	const source = readFileSync(sourcePath, 'utf8')
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	}).outputText
	const module = { exports: {} }
	const loader = new Function('exports', 'module', compiled)
	loader(module.exports, module)
	return module.exports
}

const {
	agendaServiceBucketForReservation,
	buildAgendaCalendarSegments,
	filterAgendaReservationsByBucket,
} = loadAgendaModule()

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
