import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	historicalUsageDetails,
	historicalUsageFormForToggledReservation,
	materialOpenUnitRowsForMaterial,
	materialUsageSummary,
	materialUsageRowsForMaterial,
	workOrderMaterialUsageSummary,
} from './inventory-usage'

test('materialUsageRowsForMaterial preserves legacy and stock movement consumption rows', () => {
	const rows = materialUsageRowsForMaterial(
		{ id: 7 },
		[
			{ id: 'legacy-1', material: '7', quantity: 1 },
			{ id: 'legacy-2', material: 8, quantity: 2 },
		],
		[
			{
				id: 10,
				movement_type: 'consumption',
				occurred_on: '2026-07-22',
				work_order: 4,
				lines: [
					{
						id: 3,
						material: 7,
						material_name: 'Shampoo',
						estimated_total_cost: 25,
					},
				],
			},
			{
				id: 11,
				movement_type: 'purchase',
				lines: [{ id: 4, material: 7 }],
			},
		],
	)

	assert.deepEqual(rows, [
		{ id: 'legacy-1', material: '7', quantity: 1 },
		{
			id: 'stock-10-3',
			material: 7,
			material_name: 'Shampoo',
			consumed_at: '2026-07-22',
			work_order: 4,
			estimated_total_cost: 25,
		},
	])
})

test('materialOpenUnitRowsForMaterial preserves string-compatible material matching', () => {
	const openUnits = [{ id: 1, material: '7' }, { id: 2, material: 8 }]
	assert.deepEqual(materialOpenUnitRowsForMaterial({ id: 7 }, openUnits), [
		openUnits[0],
	])
})

test('workOrderMaterialUsageSummary returns null without work order consumptions', () => {
	assert.equal(workOrderMaterialUsageSummary({ id: 7 }, [], [], []), null)
})

test('workOrderMaterialUsageSummary preserves open-unit grouping and extra count', () => {
	assert.deepEqual(
		workOrderMaterialUsageSummary(
			{ id: 7 },
			[
				{ work_order: '7', material: 1, quantity: 0, open_unit: true },
				{ work_order: 7, material: 2, quantity: 2 },
			],
			[
				{
					movement_type: 'consumption',
					work_order: 7,
					lines: [{ material: 1, quantity: 0, open_unit: true }],
				},
			],
			[
				{ id: 1, name: 'Shampoo', unit: 'ml' },
				{ id: 2, name: 'Paño', unit: 'u' },
			],
		),
		{ label: 'Shampoo: 2 usos de unidad abierta', extra: ' +1' },
	)
})

test('workOrderMaterialUsageSummary preserves quantity labels when a material was consumed', () => {
	const summary = workOrderMaterialUsageSummary(
		{ id: 7 },
		[{ work_order: 7, material: 1, material_name: 'Cera', quantity: 2 }],
		[],
		[{ id: 1, name: 'Cera', unit: 'ml' }],
	)

	assert.ok(summary?.label.startsWith('Cera:'))
	assert.equal(summary?.extra, '')
})

test('materialUsageSummary preserves supplied backend totals', () => {
	const rows = [{ quantity: 1, estimated_total_cost: 2, consumed_at: '2026-07-20' }]
	assert.deepEqual(
		materialUsageSummary(
			{
				usage_count: '3',
				total_consumed_quantity: '4',
				total_consumed_estimated_cost: '5',
				last_consumed_at: '2026-07-22',
			},
			rows,
		),
		{
			count: 3,
			totalQuantity: 4,
			totalCost: 5,
			lastConsumedAt: '2026-07-22',
			rows,
		},
	)
})

test('materialUsageSummary derives missing totals from material rows', () => {
	const rows = [
		{ quantity: '2', estimated_total_cost: '3', consumed_at: '2026-07-21' },
		{ quantity: 1, estimated_total_cost: 4, consumed_at: '2026-07-20' },
	]
	const summary = materialUsageSummary({}, rows)

	assert.equal(summary.count, 2)
	assert.equal(summary.totalQuantity, 3)
	assert.equal(summary.totalCost, 7)
	assert.equal(summary.lastConsumedAt, '2026-07-21')
	assert.equal(summary.rows, rows)
})

test('historicalUsageDetails preserves material selection and past reservation filtering', () => {
	const details = historicalUsageDetails(
		{
			material: '7',
			service: '3',
			reservations: ['1', '2'],
			stock_quantity_to_decrement: '3',
		},
		[
			{ id: 7, unit: 'ml', estimated_unit_cost: '2' },
			{ id: 8, unit: 'u', estimated_unit_cost: 5 },
		],
		[
			{ id: 1, service: 3, day: '2026-07-20', status: 'confirmed' },
			{ id: 2, service: 3, day: '2026-07-22', status: 'confirmed' },
			{ id: 3, service: 3, day: '2026-07-23', status: 'confirmed' },
			{ id: 4, service: 3, day: '2026-07-21', status: 'canceled' },
			{ id: 5, service: 4, day: '2026-07-21', status: 'confirmed' },
		],
		'2026-07-22',
	)

	assert.equal(details.selectedMaterial?.id, 7)
	assert.deepEqual(
		details.pastServiceReservations.map((reservation) => reservation.id),
		[2, 1],
	)
	assert.equal(details.selectedCount, 2)
	assert.equal(details.unitQuantity, 3)
	assert.equal(details.consumptionPerService, 1.5)
	assert.equal(details.unitCost, 2)
	assert.equal(details.materialUnit, 'ml')
})

test('historicalUsageDetails keeps empty selection defaults', () => {
	const details = historicalUsageDetails({}, [], [], '2026-07-22')

	assert.equal(details.selectedMaterial, undefined)
	assert.deepEqual(details.selectedReservationIds, [])
	assert.deepEqual(details.pastServiceReservations, [])
	assert.equal(details.selectedCount, 0)
	assert.equal(details.unitQuantity, 1)
	assert.equal(details.consumptionPerService, 0)
	assert.equal(details.unitCost, 0)
	assert.equal(details.materialUnit, 'unidad')
})

test('historicalUsageFormForToggledReservation preserves selected ids and date range', () => {
	const form = { reservations: ['2'], opened_at: '', finished_at: '' }
	const reservations = [
		{ id: 1, day: '2026-07-20' },
		{ id: 2, day: '2026-07-22' },
	]

	assert.deepEqual(
		historicalUsageFormForToggledReservation(form, '1', reservations),
		{
			reservations: ['2', '1'],
			opened_at: '2026-07-20',
			finished_at: '2026-07-22',
		},
	)
	assert.deepEqual(
		historicalUsageFormForToggledReservation(form, '2', reservations),
		{
			reservations: [],
			opened_at: '',
			finished_at: '',
		},
	)
})
