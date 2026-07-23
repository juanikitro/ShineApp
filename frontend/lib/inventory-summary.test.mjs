import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	inventorySummaryForMaterials,
	toolSummaryForTools,
} from './inventory-summary'

test('inventorySummaryForMaterials keeps stock, usage, cost and open-unit totals', () => {
	const materials = [
		{ id: '1', stock_value: '12.5', open_units_active_count: '2' },
		{
			id: '2',
			stock_quantity: '3',
			estimated_unit_cost: '4',
			open_units_active_count: null,
		},
	]
	const materialUsageSummary = (material) =>
		material.id === '1'
			? { count: 2, totalCost: 7.5 }
			: { count: 1, totalCost: 4 }

	assert.deepEqual(
		inventorySummaryForMaterials(materials, materialUsageSummary),
		{
			stockValue: 24.5,
			usageCount: 3,
			consumedCost: 11.5,
			openUnits: 2,
		},
	)
	assert.deepEqual(inventorySummaryForMaterials([], materialUsageSummary), {
		stockValue: 0,
		usageCount: 0,
		consumedCost: 0,
		openUnits: 0,
	})
})

test('toolSummaryForTools prefers stored totals and handles empty quantities', () => {
	assert.deepEqual(
		toolSummaryForTools([
			{ quantity: '2', unit_value: '10' },
			{ quantity: '', unit_value: '20', total_value: '15' },
		]),
		{ records: 2, quantity: 2, value: 35 },
	)
	assert.deepEqual(toolSummaryForTools([]), {
		records: 0,
		quantity: 0,
		value: 0,
	})
})
