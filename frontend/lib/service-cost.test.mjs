import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	formatRatioLabel,
	serviceCostRatios,
	serviceEstimatedCost,
	serviceRecipeCost,
} from './service-cost'

test('serviceRecipeCost returns null without recipe lines', () => {
	assert.equal(serviceRecipeCost(null), null)
	assert.equal(serviceRecipeCost({}), null)
	assert.equal(serviceRecipeCost({ materials: [] }), null)
})

test('serviceRecipeCost sums quantity x unit cost', () => {
	const cost = serviceRecipeCost({
		materials: [
			{ quantity: '100', material_unit_cost: '10' },
			{ quantity: '2', material_unit_cost: '50.5' },
		],
	})
	assert.equal(cost, 1101)
})

test('serviceRecipeCost treats missing values as zero', () => {
	assert.equal(
		serviceRecipeCost({ materials: [{ quantity: '', material_unit_cost: '' }] }),
		0,
	)
})

test('serviceEstimatedCost prefers recipe over manual and is not estimated', () => {
	const result = serviceEstimatedCost({
		estimated_material_cost: '9999',
		materials: [{ quantity: '100', material_unit_cost: '10' }],
	})
	assert.deepEqual(result, { cost: 1000, isEstimated: false })
})

test('serviceEstimatedCost falls back to manual cost and flags estimated', () => {
	const result = serviceEstimatedCost({ estimated_material_cost: '2500' })
	assert.deepEqual(result, { cost: 2500, isEstimated: true })
})

test('serviceEstimatedCost returns null cost when neither recipe nor manual', () => {
	assert.deepEqual(serviceEstimatedCost({}), {
		cost: null,
		isEstimated: false,
	})
	assert.deepEqual(serviceEstimatedCost({ estimated_material_cost: '' }), {
		cost: null,
		isEstimated: false,
	})
})

test('serviceCostRatios returns nulls when cost is null', () => {
	assert.deepEqual(serviceCostRatios('15000', null), {
		margin: null,
		marginRate: null,
		costRatio: null,
	})
})

test('serviceCostRatios returns nulls when price is missing', () => {
	assert.deepEqual(serviceCostRatios('', 1000), {
		margin: null,
		marginRate: null,
		costRatio: null,
	})
})

test('serviceCostRatios returns margin but no rates when price is 0', () => {
	assert.deepEqual(serviceCostRatios('0', 1000), {
		margin: -1000,
		marginRate: null,
		costRatio: null,
	})
})

test('serviceCostRatios computes margin, marginRate and costRatio', () => {
	const ratios = serviceCostRatios('10000', 2500)
	assert.equal(ratios.margin, 7500)
	assert.equal(ratios.marginRate, 75)
	assert.equal(ratios.costRatio, 25)
})

test('formatRatioLabel formats percentage or dash', () => {
	assert.equal(formatRatioLabel(null), '—')
	assert.equal(formatRatioLabel(25), '25.0%')
	assert.equal(formatRatioLabel(16.666), '16.7%')
})
