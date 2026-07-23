import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	filterSuppliersForSearch,
	filterToolsForSearch,
	materialSelectOptions,
	materialStockValue,
	materialUnitValue,
	openMaterialUnitSelectOptions,
	supplierSelectOptions,
	supplierListInsight,
	toolTotalValue,
} from './inventory-display'
import { money } from './page-support'

test('supplierListInsight preserves supplier insights and empty fallback', () => {
	const insights = { purchases: 3 }
	assert.equal(supplierListInsight({ list_insights: insights }), insights)
	assert.deepEqual(supplierListInsight({}), {})
})

test('filterToolsForSearch preserves empty-search identity and matching fields', () => {
	const tools = [
		{ id: 1, name: 'Pulidora', status: 'maintenance', notes: 'Cambio de disco' },
		{ id: 2, name: 'Aspiradora', status: 'available', notes: '' },
	]
	const labels = { maintenance: 'En mantenimiento', available: 'Disponible' }

	assert.equal(filterToolsForSearch(tools, '', labels), tools)
	assert.deepEqual(
		filterToolsForSearch(tools, 'MANTENIMIENTO', labels).map((item) => item.id),
		[1],
	)
	assert.deepEqual(
		filterToolsForSearch(tools, 'disco', labels).map((item) => item.id),
		[1],
	)
	assert.deepEqual(
		filterToolsForSearch(tools, ' ', labels).map((item) => item.id),
		[1],
	)
})

test('filterSuppliersForSearch preserves empty-search identity and supplier insight matches', () => {
	const suppliers = [
		{
			id: 1,
			name: 'Insumos SA',
			legal_name: 'Insumos legales',
			list_insights: { last_purchase_on: '2026-07-23' },
		},
		{ id: 2, name: 'Herramientas Norte', website: 'herramientas.example' },
	]

	assert.equal(filterSuppliersForSearch(suppliers, '   '), suppliers)
	assert.deepEqual(
		filterSuppliersForSearch(suppliers, 'LEGALES').map((item) => item.id),
		[1],
	)
	assert.deepEqual(
		filterSuppliersForSearch(suppliers, '2026-07').map((item) => item.id),
		[1],
	)
	assert.deepEqual(
		filterSuppliersForSearch(suppliers, 'example').map((item) => item.id),
		[2],
	)
})

test('materialUnitValue keeps the last purchase cost before the estimate', () => {
	assert.equal(
		materialUnitValue({ last_purchase_unit_cost: '25', estimated_unit_cost: '20' }),
		25,
	)
	assert.equal(materialUnitValue({ estimated_unit_cost: '20' }), 20)
})

test('materialStockValue preserves direct stock values including zero', () => {
	assert.equal(
		materialStockValue({ stock_value: 0, stock_quantity: 4, estimated_unit_cost: 10 }),
		0,
	)
	assert.equal(
		materialStockValue({ stock_quantity: '4', estimated_unit_cost: '10' }),
		40,
	)
})

test('toolTotalValue preserves direct total values and its quantity fallback', () => {
	assert.equal(toolTotalValue({ total_value: 0, quantity: 4, unit_value: 10 }), 0)
	assert.equal(toolTotalValue({ quantity: '4', unit_value: '10' }), 40)
})

test('inventory select options preserve stock text and open-unit filtering', () => {
	assert.deepEqual(
		materialSelectOptions([
			{ id: 0, name: 'Cera', stock_quantity: 2, unit: 'u', estimated_unit_cost: 50 },
		]),
		[
			{
				value: '0',
				label: 'Cera',
				meta: `stock 2 u - costo ${money(50)}`,
			},
		],
	)
	assert.deepEqual(
		openMaterialUnitSelectOptions([
			{ id: 1, status: 'open', material_name: 'Cera', opened_at: '2026-07-23', consumptions_count: 2 },
			{ id: 2, status: 'closed', material_name: 'Paño' },
			{ id: 3, status: 'open', material_name: null, opened_at: '', consumptions_count: null },
		]),
		[
			{
				value: '1',
				label: 'Cera',
				meta: 'abierta 2026-07-23 - 2 usos',
			},
			{
				value: '3',
				label: 'Unidad abierta',
				meta: 'abierta  - 0 usos',
			},
		],
	)
})

test('supplierSelectOptions preserves non-empty supplier metadata without normalization', () => {
	assert.deepEqual(
		supplierSelectOptions([
			{
				id: 0,
				name: 'Insumos SA',
				legal_name: '  Insumos legales  ',
				category: '',
				contact_name: 'Ana',
				phone: 0,
				email: 'ana@example.com',
			},
		]),
		[
			{
				value: '0',
				label: 'Insumos SA',
				meta: '  Insumos legales   - Ana - ana@example.com',
			},
		],
	)
})
