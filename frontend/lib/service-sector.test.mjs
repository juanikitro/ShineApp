import assert from 'node:assert/strict'
import { test } from 'vitest'

import { sectorIdsByServiceId, serviceTypeForSectorId } from './service-sector'

const sectors = [
	{ id: 1, key: 'wash' },
	{ id: '2', key: 'detailing' },
]

test('uses the matching detailing sector across string and numeric identifiers', () => {
	assert.equal(serviceTypeForSectorId(2, sectors), 'detailing')
	assert.equal(serviceTypeForSectorId('2', sectors), 'detailing')
})

test('keeps wash as the fallback for other and missing sectors', () => {
	assert.equal(serviceTypeForSectorId(1, sectors), 'wash')
	assert.equal(serviceTypeForSectorId('999', sectors), 'wash')
})

test('maps valid service sector ids and preserves invalid sectors as null', () => {
	assert.deepEqual(
		sectorIdsByServiceId([
			{ id: 1, sector: '2' },
			{ id: '3', sector: 4 },
			{ id: 5, sector: 0 },
			{ id: 6, sector: 'invalid' },
			{ id: null, sector: 7 },
		]),
		{ 1: 2, 3: 4, 5: null, 6: null },
	)
})
