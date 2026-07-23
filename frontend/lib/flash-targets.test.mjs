import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	agendaCardFlashKey,
	createFlashClass,
	createRecordClass,
	fieldFlashKey,
	recordFlashKey,
} from './flash-targets'

test('builds record flash keys only for present record ids', () => {
	assert.equal(recordFlashKey('reservation', 7), 'record:reservation:7')
	assert.equal(recordFlashKey('reservation', 0), 'record:reservation:0')
	assert.equal(recordFlashKey('reservation', ''), null)
	assert.equal(recordFlashKey('reservation', null), null)
	assert.equal(recordFlashKey('reservation', undefined), null)
})

test('builds field and agenda flash keys with their existing prefixes', () => {
	assert.equal(fieldFlashKey('reservation.customer'), 'field:reservation.customer')
	assert.equal(agendaCardFlashKey('reservation:7'), 'agenda:reservation:7')
})

test('creates flash and record classes from the currently flashed key', () => {
	const flashClass = createFlashClass('record:customer:7')
	assert.equal(flashClass('record:customer:7'), 'motion-flash')
	assert.equal(flashClass('record:customer:8'), '')
	assert.equal(flashClass(null), '')

	const recordClass = createRecordClass('record:customer:7')
	assert.equal(recordClass('customer', 7), 'record motion-flash')
	assert.equal(recordClass('customer', 8, 'customer-card'), 'record customer-card')
	assert.equal(recordClass('customer', 7, 'customer-card'), 'record customer-card motion-flash')
})
