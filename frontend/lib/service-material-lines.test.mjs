import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	addServiceMaterialLine,
	removeServiceMaterialLine,
	updateServiceMaterialLine,
} from './service-material-lines'

test('service material line helpers append an empty line and update only its target', () => {
	const lines = [
		{ id: 'line-1', material: 'material-1', quantity: '1' },
		{ id: 'line-2', material: 'material-2', quantity: '2' },
	]

	assert.deepEqual(addServiceMaterialLine(lines), [
		...lines,
		{ id: '', material: '', quantity: '' },
	])
	assert.deepEqual(updateServiceMaterialLine(lines, 1, { quantity: 0 }), [
		{ id: 'line-1', material: 'material-1', quantity: '1' },
		{ id: 'line-2', material: 'material-2', quantity: 0 },
	])
	assert.equal(lines[1].quantity, '2')
})

test('service material line helpers remove matching indexes and preserve invalid or empty inputs', () => {
	const lines = [{ id: 'line-1' }, { id: 'line-2' }]

	assert.deepEqual(removeServiceMaterialLine(lines, 0), [{ id: 'line-2' }])
	assert.deepEqual(removeServiceMaterialLine(lines, 9), lines)
	assert.deepEqual(removeServiceMaterialLine([], 0), [])
	assert.deepEqual(updateServiceMaterialLine([], 0, { material: 'material-1' }), [])
})
