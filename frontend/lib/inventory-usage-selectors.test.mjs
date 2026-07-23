import assert from 'node:assert/strict'
import { test } from 'vitest'

import { inventoryUsageSelectors } from './inventory-usage-selectors'

const material = { id: 'material-1', unit: 'ml' }

test('inventory usage selectors preserve material rows, units and summary fallbacks', () => {
	const selectors = inventoryUsageSelectors({
		consumptions: [
			{
				id: 'legacy-1',
				material: 'material-1',
				quantity: '2',
				estimated_total_cost: '4',
				consumed_at: '2026-07-20',
			},
		],
		stockMovements: [
			{
				id: 'movement-1',
				movement_type: 'consumption',
				occurred_on: '2026-07-21',
				lines: [
					{
						id: 'line-1',
						material: 'material-1',
						quantity: '3',
						estimated_total_cost: '6',
					},
				],
			},
			{ id: 'movement-2', movement_type: 'purchase', lines: [] },
		],
		materialOpenUnits: [
			{ id: 'unit-1', material: 'material-1' },
			{ id: 'unit-2', material: 'other' },
		],
		materials: [material],
	})

	const rows = selectors.materialUsageRows(material)
	assert.equal(rows.length, 2)
	assert.equal(rows[1].id, 'stock-movement-1-line-1')
	assert.equal(rows[1].consumed_at, '2026-07-21')
	assert.deepEqual(selectors.materialOpenUnitRows(material), [
		{ id: 'unit-1', material: 'material-1' },
	])
	assert.deepEqual(selectors.materialUsageSummary(material), {
		count: 2,
		totalQuantity: 5,
		totalCost: 10,
		lastConsumedAt: '2026-07-20',
		rows,
	})
})

test('inventory usage selectors preserve work-order material usage and empty results', () => {
	const selectors = inventoryUsageSelectors({
		consumptions: [
			{ material: 'material-1', work_order: 'order-1', quantity: '0' },
		],
		stockMovements: [],
		materialOpenUnits: [],
		materials: [material],
	})

	assert.deepEqual(selectors.workOrderMaterialUsageSummary({ id: 'order-1' }), {
		label: 'Material: 0 ml',
		extra: '',
	})
	assert.equal(
		selectors.workOrderMaterialUsageSummary({ id: 'order-missing' }),
		null,
	)
})
