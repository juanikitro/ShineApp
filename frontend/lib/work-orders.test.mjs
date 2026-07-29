import assert from 'node:assert/strict'
import { test } from 'vitest'

import { money } from './page-support'

import {
	agendaRangeModes,
	filterFreeQuotesBySector,
	createWorkReservationRow,
	groupReservationsByEntryDate,
	groupReservationsByWorkOrderStatus,
	groupReservationsByWorkOrderStatusColumns,
	reservationCanMoveWorkStatus,
	workOrderForReservation,
	workOrderSelectOptions,
	workReservationRow,
	workStatusColumnForStatus,
	workStatusColumnKeyForValue,
	workStatusDropStatusForColumn,
	workStatusDropTargetForOver,
	workStatusDropValue,
	workStatusForReservation,
	updateReservationWorkOrder,
	upsertWorkOrderRecord,
	workViewModes,
} from './work-orders'

test('keeps the work and agenda view options shown in the agenda controls', () => {
	assert.deepEqual(workViewModes, [
		{ value: 'agenda', label: 'Agenda' },
		{ value: 'status', label: 'Estado' },
		{ value: 'entry-date', label: 'Fecha de ingreso' },
	])
	assert.deepEqual(agendaRangeModes, [
		{ value: 'week', label: 'Semana' },
		{ value: 'month', label: 'Mes' },
	])
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

test('keeps free quotes without reservation or date filtered by sector', () => {
	const sectorByService = { '1': 10, '2': 20 }
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
		filterFreeQuotesBySector(quotes, sectorByService, 10).map((item) => item.id),
		[1],
	)
	assert.deepEqual(
		filterFreeQuotesBySector(quotes, sectorByService, null).map((item) => item.id),
		[1, 4],
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

test('createWorkReservationRow preserves the reservation-to-work-order lookup', () => {
	const workOrder = { id: 14, reservation: 7, status: 'ready' }
	const getReservationRow = createWorkReservationRow({ 7: workOrder })

	assert.deepEqual(getReservationRow({ id: 7, day: '2026-07-23' }), {
		key: 'reservation:7',
		day: '2026-07-23',
		displayDay: '2026-07-23',
		phase: 'entry',
		kind: 'reservation-work-order',
		reservation: { id: 7, day: '2026-07-23' },
		workOrder,
	})
	assert.equal(
		createWorkReservationRow([])({ id: 8, day: '2026-07-24' }).kind,
		'reservation-only',
	)
})

test('workOrderSelectOptions preserves economy-sensitive work order labels', () => {
	const orders = [
		{
			id: 0,
			customer_name: 'Ana',
			vehicle_label: 'Fiesta',
			service_name: 'Lavado',
			balance_due: 50,
		},
	]

	assert.deepEqual(workOrderSelectOptions(orders, false), [
		{ value: '0', label: 'Ana - Fiesta', meta: 'Lavado' },
	])
	assert.deepEqual(workOrderSelectOptions(orders, true), [
		{
			value: '0',
			label: 'Ana - Fiesta',
			meta: `Lavado - deuda ${money(50)}`,
		},
	])
})

test('normalizes direct and prefixed work-status drop values', () => {
	assert.equal(workStatusDropValue('work-status:ready'), 'ready')
	assert.equal(workStatusDropValue('in_progress'), 'in_progress')
	assert.equal(workStatusDropValue(null), null)
	assert.equal(workStatusDropValue(undefined), null)
})

test('resolves work status columns from keys, statuses and known labels', () => {
	const columns = [
		{ key: 'not_started', label: 'Sin ingresar', statuses: ['pending', 'confirmed'] },
		{ key: 'finished', label: 'Finalizados', statuses: ['ready', 'delivered'] },
	]
	const labels = { ready: 'Listo', canceled: 'Cancelada' }

	assert.equal(
		workStatusColumnKeyForValue('work-status:finished', columns, labels),
		'finished',
	)
	assert.equal(workStatusColumnKeyForValue('ready', columns, labels), 'finished')
	assert.equal(workStatusColumnKeyForValue('canceled', columns, labels), 'canceled')
	assert.equal(workStatusColumnKeyForValue('unknown', columns, labels), null)
})

test('resolves DnD status targets and their drop statuses', () => {
	const columns = [
		{
			key: 'finished',
			label: 'Finalizados',
			statuses: ['ready', 'delivered'],
			dropStatus: 'ready',
		},
	]
	const labels = { canceled: 'Cancelada' }

	assert.equal(
		workStatusDropTargetForOver(
			{ data: { current: { statusGroup: 'work-status:finished' } } },
			columns,
			labels,
		),
		'finished',
	)
	assert.equal(workStatusDropStatusForColumn('finished', columns, labels), 'ready')
	assert.equal(workStatusDropStatusForColumn('canceled', columns, labels), 'canceled')
	assert.equal(workStatusDropStatusForColumn(null, columns, labels), null)
})

test('updateReservationWorkOrder preserves the optimistic reservation status contract', () => {
	assert.deepEqual(
		updateReservationWorkOrder(
			{ id: 1, status: 'confirmed' },
			{ id: 9, status: 'ready' },
			{ ready: 'Listo' },
		),
		{
			id: 1,
			status: 'ready',
			status_label: 'Listo',
			work_order: { id: 9, status: 'ready' },
		},
	)
	assert.deepEqual(
		updateReservationWorkOrder(
			{ id: 1, status: 'confirmed', status_label: 'Confirmada' },
			{ id: 9, status: '' },
			{},
		),
		{
			id: 1,
			status: 'confirmed',
			status_label: 'Confirmada',
			work_order: { id: 9, status: '' },
		},
	)
})

test('builds entry agenda rows without altering reservation or work-order records', () => {
	const reservation = { id: 10, day: '2026-07-22' }
	const workOrder = { id: 8, status: 'confirmed' }

	assert.deepEqual(workReservationRow(reservation, null), {
		key: 'reservation:10',
		day: '2026-07-22',
		displayDay: '2026-07-22',
		phase: 'entry',
		kind: 'reservation-only',
		reservation,
		workOrder: null,
	})
	assert.equal(
		workReservationRow(reservation, workOrder).kind,
		'reservation-work-order',
	)
	assert.equal(workReservationRow(reservation, workOrder).workOrder, workOrder)
})

test('upsertWorkOrderRecord prepends new orders and replaces matching identifiers', () => {
	const current = [{ id: 1, status: 'confirmed' }]
	const inserted = { id: 0, status: 'ready' }
	assert.deepEqual(upsertWorkOrderRecord(current, inserted), [inserted, ...current])
	assert.deepEqual(
		upsertWorkOrderRecord(current, { id: 1, status: 'ready' }),
		[{ id: 1, status: 'ready' }],
	)
	assert.equal(upsertWorkOrderRecord(current, {}), current)
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

test('work-order helpers handle missing ids, unknown columns and reservation flags', () => {
	assert.equal(workOrderForReservation({ id: '' }, [{ id: 1, reservation: '' }]), null)
	assert.equal(workStatusForReservation({ id: 1 }, []), null)
	assert.equal(workStatusColumnForStatus(null, []), null)
	assert.equal(workStatusColumnForStatus('moved', []), null)

	assert.deepEqual(
		filterFreeQuotesBySector(
			[
				{ id: 1, reservation: { id: 10 }, items: [{ service: 1 }] },
				{ id: 2, reservation: null, has_reservation: false, items: [{ service: 1 }] },
			],
			{ '1': 5 },
			5,
		).map((quote) => quote.id),
		[2],
	)
})
