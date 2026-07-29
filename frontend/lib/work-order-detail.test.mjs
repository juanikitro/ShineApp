import assert from 'node:assert/strict'
import { test } from 'vitest'

import { workOrderServicePatch, workOrderStatusFocusKey } from './work-order-detail'

const services = [
	{ id: 1, base_price: '1500' },
	{ id: 2, base_price: '2400' },
]

test('workOrderServicePatch updates the economic total from the matching service', () => {
	assert.deepEqual(
		workOrderServicePatch(
			{ total_amount: '900' },
			'2',
			services,
			true,
		),
		{ service: '2', total_amount: '2400' },
	)
})

test('workOrderServicePatch preserves the previous total for a missing service and omits it without economy access', () => {
	assert.deepEqual(
		workOrderServicePatch(
			{ total_amount: '900' },
			'unknown',
			services,
			true,
		),
		{ service: 'unknown', total_amount: '900' },
	)
	assert.deepEqual(
		workOrderServicePatch(
			{ total_amount: '900' },
			'2',
			services,
			false,
		),
		{ service: '2' },
	)
})

test('workOrderStatusFocusKey preserves the economy visibility focus flow', () => {
	assert.equal(
		workOrderStatusFocusKey(true),
		'detail.workorder.total_amount',
	)
	assert.equal(
		workOrderStatusFocusKey(false),
		'detail.workorder.estimated_delivery_at',
	)
})
