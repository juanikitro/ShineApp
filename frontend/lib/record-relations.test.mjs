import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	createRecordRelationLookups,
	customerForRecord,
	vehicleForRecord,
} from './record-relations'

const customers = [
	{ id: 7, name: 'Ana' },
	{ id: '8', name: 'Beto' },
]
const vehicles = [
	{ id: 11, brand: 'Ford' },
	{ id: '12', brand: 'Fiat' },
]

test('customerForRecord resolves every supported customer id field', () => {
	assert.equal(customerForRecord({ customer: '7' }, customers), customers[0])
	assert.equal(customerForRecord({ customer_id: 8 }, customers), customers[1])
	assert.equal(customerForRecord({ customerId: 7 }, customers), customers[0])
})

test('customerForRecord keeps missing and blank ids unresolved', () => {
	assert.equal(customerForRecord(null, customers), null)
	assert.equal(customerForRecord({ customer: '' }, customers), null)
	assert.equal(customerForRecord({ customer: 99 }, customers), null)
})

test('vehicleForRecord resolves every supported vehicle id field', () => {
	assert.equal(vehicleForRecord({ vehicle: '11' }, vehicles), vehicles[0])
	assert.equal(vehicleForRecord({ vehicle_id: 12 }, vehicles), vehicles[1])
	assert.equal(vehicleForRecord({ vehicleId: 11 }, vehicles), vehicles[0])
})

test('vehicleForRecord preserves zero ids and unresolved records', () => {
	const zeroVehicle = { id: 0, brand: 'Zanella' }

	assert.equal(vehicleForRecord({ vehicle: 0 }, [zeroVehicle]), zeroVehicle)
	assert.equal(vehicleForRecord({ vehicle: '' }, vehicles), null)
	assert.equal(vehicleForRecord(undefined, vehicles), null)
})

test('createRecordRelationLookups keeps each catalog bound to its record lookup', () => {
	const lookups = createRecordRelationLookups(customers, vehicles)
	assert.equal(lookups.customerForRecord({ customer: '8' }), customers[1])
	assert.equal(lookups.vehicleForRecord({ vehicle: '12' }), vehicles[1])
})
