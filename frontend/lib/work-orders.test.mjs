import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadWorkOrdersModule() {
	const sourcePath = resolve('lib/work-orders.ts')
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
	filterFreeQuotesByServiceBucket,
	filterReservationsByServiceBucket,
	groupReservationsByEntryDate,
	groupReservationsByWorkOrderStatus,
	groupReservationsByWorkOrderStatusColumns,
	reservationCanMoveWorkStatus,
	workStatusColumnForStatus,
	workStatusForReservation,
	workOrderForReservation,
} = loadWorkOrdersModule()

test('filters reservations by global service bucket using reservation service data', () => {
	const serviceTypes = {
		1: 'wash',
		2: 'detailing',
		3: 'combo',
	}
	const reservations = [
		{ id: 10, service: 2, day: '2026-05-09' },
		{ id: 11, service: 1, day: '2026-05-10' },
		{
			id: 12,
			day: '2026-05-11',
			items: [{ id: 100, service: 3 }],
		},
	]

	assert.deepEqual(
		filterReservationsByServiceBucket(
			reservations,
			serviceTypes,
			'wash',
		).map((item) => item.id),
		[11, 12],
	)
	assert.deepEqual(
		filterReservationsByServiceBucket(
			reservations,
			serviceTypes,
			'detailing',
		).map((item) => item.id),
		[10],
	)
})

test('groups reservations by associated work order status in operational order', () => {
	const reservations = [
		{ id: 10, status: 'ready', work_order: { id: 1, status: 'ready' } },
		{ id: 11, status: 'confirmed' },
		{ id: 12, status: 'in_progress' },
	]
	const workOrders = [
		{ id: 2, reservation: 11, status: 'confirmed' },
		{ id: 3, reservation: 12, status: 'in_progress' },
	]
	const groups = groupReservationsByWorkOrderStatus(
		reservations,
		workOrders,
		{
			confirmed: 'Confirmada',
			in_progress: 'En proceso',
			ready: 'Listo',
			delivered: 'Entregado',
		},
	)

	assert.deepEqual(
		groups.map((group) => ({
			key: group.key,
			label: group.label,
			ids: group.reservations.map((item) => item.id),
		})),
		[
			{ key: 'confirmed', label: 'Confirmada', ids: [11] },
			{ key: 'in_progress', label: 'En proceso', ids: [12] },
			{ key: 'ready', label: 'Listo', ids: [10] },
			{ key: 'delivered', label: 'Entregado', ids: [] },
		],
	)
})

test('groups work statuses into operational columns', () => {
	const columns = [
		{
			key: 'not_started',
			label: 'Sin ingresar',
			statuses: ['pending', 'confirmed'],
			dropStatus: 'confirmed',
		},
		{
			key: 'in_progress',
			label: 'En proceso',
			statuses: ['in_progress'],
			dropStatus: 'in_progress',
		},
		{
			key: 'finished',
			label: 'Finalizados',
			statuses: ['ready', 'delivered'],
			dropStatus: 'ready',
		},
	]
	const reservations = [
		{ id: 10, status: 'pending', work_order: { id: 1, status: 'pending' } },
		{ id: 11, status: 'confirmed', work_order: { id: 2, status: 'confirmed' } },
		{ id: 12, status: 'in_progress' },
		{ id: 13, status: 'ready', work_order: { id: 4, status: 'ready' } },
		{ id: 14, status: 'delivered', work_order: { id: 5, status: 'delivered' } },
		{ id: 15, status: 'canceled', work_order: { id: 6, status: 'ready' } },
	]
	const workOrders = [{ id: 3, reservation: 12, status: 'in_progress' }]

	const groups = groupReservationsByWorkOrderStatusColumns(
		reservations,
		workOrders,
		columns,
	)

	assert.deepEqual(
		groups.map((group) => ({
			key: group.key,
			label: group.label,
			dropStatus: group.dropStatus,
			ids: group.reservations.map((item) => item.id),
		})),
		[
			{
				key: 'not_started',
				label: 'Sin ingresar',
				dropStatus: 'confirmed',
				ids: [10, 11],
			},
			{
				key: 'in_progress',
				label: 'En proceso',
				dropStatus: 'in_progress',
				ids: [12],
			},
			{
				key: 'finished',
				label: 'Finalizados',
				dropStatus: 'ready',
				ids: [13, 14],
			},
		],
	)
	assert.equal(workStatusColumnForStatus('delivered', columns).key, 'finished')
})

test('uses reservation status as the work status source of truth', () => {
	const columns = [
		{
			key: 'not_started',
			label: 'Sin ingresar',
			statuses: ['pending', 'confirmed'],
			dropStatus: 'confirmed',
		},
		{
			key: 'finished',
			label: 'Finalizados',
			statuses: ['ready', 'delivered'],
			dropStatus: 'ready',
		},
	]
	const reservations = [
		{ id: 20, status: 'confirmed', work_order: { id: 1, status: 'delivered' } },
	]

	assert.equal(workStatusForReservation(reservations[0], []), 'confirmed')
	assert.deepEqual(
		groupReservationsByWorkOrderStatusColumns(
			reservations,
			[],
			columns,
		).map((group) => ({
			key: group.key,
			ids: group.reservations.map((item) => item.id),
		})),
		[
			{ key: 'not_started', ids: [20] },
			{ key: 'finished', ids: [] },
		],
	)
})

test('groups reservations by future entry date with nearest dates first', () => {
	const groups = groupReservationsByEntryDate(
		[
			{ id: 10, day: '2026-05-08' },
			{ id: 11, day: '2026-05-11' },
			{ id: 12, day: '2026-05-09' },
			{ id: 13, day: '' },
		],
		'2026-05-09',
	)

	assert.deepEqual(
		groups.map((group) => ({
			key: group.key,
			entryDate: group.entryDate,
			ids: group.reservations.map((item) => item.id),
		})),
		[
			{ key: '2026-05-09', entryDate: '2026-05-09', ids: [12] },
			{ key: '2026-05-11', entryDate: '2026-05-11', ids: [11] },
		],
	)
})

test('keeps free quotes without reservation or date as the final no-date group', () => {
	const serviceTypes = {
		1: 'wash',
		2: 'detailing',
	}
	const quotes = [
		{
			id: 1,
			has_reservation: false,
			reservation_day: null,
			items: [{ service: 1 }],
		},
		{
			id: 2,
			has_reservation: true,
			reservation_day: null,
			items: [{ service: 1 }],
		},
		{
			id: 3,
			has_reservation: false,
			reservation_day: '2026-05-12',
			items: [{ service: 1 }],
		},
		{
			id: 4,
			has_reservation: false,
			reservation_day: null,
			items: [{ service: 2 }],
		},
	]

	assert.deepEqual(
		filterFreeQuotesByServiceBucket(quotes, serviceTypes, 'wash').map(
			(item) => item.id,
		),
		[1],
	)
})

test('resolves the work order for a reservation from embedded data or lookup', () => {
	assert.equal(
		workOrderForReservation(
			{ id: 10, work_order: { id: 1, status: 'ready' } },
			[{ id: 2, reservation: 10, status: 'pending' }],
		).id,
		1,
	)
	assert.equal(
		workOrderForReservation({ id: 11 }, [{ id: 2, reservation: 11 }]).id,
		2,
	)
})

test('groups only reservations with real active work orders by work status', () => {
	const reservations = [
		{ id: 30, status: 'confirmed', work_order: { id: 10, status: 'confirmed' } },
		{ id: 31, status: 'canceled', work_order: { id: 11, status: 'ready' } },
		{ id: 32, status: 'pending', work_order: { id: 13, status: 'pending' } },
		{ id: 33, status: 'delivered' },
	]
	const workOrders = [{ id: 12, reservation: 33, status: 'delivered' }]
	const groups = groupReservationsByWorkOrderStatus(
		reservations,
		workOrders,
		{
			confirmed: 'Confirmada',
			ready: 'Listo',
			delivered: 'Entregado',
		},
	)

	assert.deepEqual(
		groups.map((group) => ({
			key: group.key,
			ids: group.reservations.map((item) => item.id),
		})),
		[
			{ key: 'confirmed', ids: [30] },
			{ key: 'ready', ids: [] },
			{ key: 'delivered', ids: [33] },
		],
	)
	assert.equal(workStatusForReservation(reservations[0], workOrders), 'confirmed')
	assert.equal(reservationCanMoveWorkStatus(reservations[0], workOrders), true)
	assert.equal(reservationCanMoveWorkStatus(reservations[1], workOrders), false)
	assert.equal(reservationCanMoveWorkStatus(reservations[2], workOrders), false)
})
