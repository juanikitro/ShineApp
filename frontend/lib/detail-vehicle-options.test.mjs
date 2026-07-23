import assert from 'node:assert/strict'
import { test } from 'vitest'

import { vehicleOptionsForDetail } from './detail-vehicle-options'

const options = [
	{ value: '1', label: 'Auto 1' },
	{ value: '2', label: 'Auto 2' },
]
const vehicles = [
	{ id: 1, customer: 10 },
	{ id: 2, customer: '20' },
]

test('vehicleOptionsForDetail preserves all options outside reservation and work order details', () => {
	assert.equal(
		vehicleOptionsForDetail('customer', { customer: 10 }, options, vehicles),
		options,
	)
})

test('vehicleOptionsForDetail preserves all options without a detail customer', () => {
	assert.deepEqual(
		vehicleOptionsForDetail('reservation', {}, options, vehicles),
		options,
	)
})

test('vehicleOptionsForDetail filters reservation and work order vehicles by customer', () => {
	assert.deepEqual(
		vehicleOptionsForDetail('reservation', { customer: '10' }, options, vehicles),
		[options[0]],
	)
	assert.deepEqual(
		vehicleOptionsForDetail('workorder', { customer: 20 }, options, vehicles),
		[options[1]],
	)
})

test('vehicleOptionsForDetail omits options without a matching vehicle customer', () => {
	assert.deepEqual(
		vehicleOptionsForDetail('workorder', { customer: 30 }, options, vehicles),
		[],
	)
})
