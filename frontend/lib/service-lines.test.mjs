import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	createServiceNotesForLine,
	serviceForLine,
	serviceLinePayload,
	serviceLinesTotal,
	serviceNotesForLine,
} from './service-lines'

const services = [
	{ id: 1, name: 'Lavado exterior', notes: 'Secar con microfibra', base_price: 1200 },
	{ id: '2', name: 'Pulido', notes: 'Revisar pintura', base_price: 3500 },
]

test('resolves a service line across numeric and string identifiers', () => {
	assert.equal(serviceForLine({ service: '1' }, services), services[0])
	assert.equal(serviceForLine({ service: 2 }, services), services[1])
	assert.equal(serviceForLine({ service: '99' }, services), undefined)
})

test('keeps explicit service notes before falling back to the selected service', () => {
	assert.equal(
		serviceNotesForLine({ service: 1, service_notes: '' }, services),
		'',
	)
	assert.equal(
		serviceNotesForLine({ service: '2', service_notes: null }, services),
		'Revisar pintura',
	)
	assert.equal(serviceNotesForLine({ service: 99 }, services), '')
})

test('createServiceNotesForLine keeps the supplied service list bound to the callback', () => {
	const notesForLine = createServiceNotesForLine(services)
	assert.equal(notesForLine({ service: 1 }), 'Secar con microfibra')
	assert.equal(notesForLine({ service: 99 }), '')
})

test('builds the standard service payload with its existing fallbacks', () => {
	assert.deepEqual(
		serviceLinePayload(
			[
				{ service: '1', description: '', quantity: 0, unit_price: 0 },
				{
					service: '99',
					description: 'Limpieza puntual',
					quantity: '2',
					unit_price: '300',
				},
			],
			services,
		),
		[
			{
				service: '1',
				description: 'Lavado exterior',
				quantity: '1',
				unit_price: 1200,
			},
			{
				service: '99',
				description: 'Limpieza puntual',
				quantity: '2',
				unit_price: '300',
			},
		],
	)
})

test('sums service line quantities and unit prices', () => {
	assert.equal(
		serviceLinesTotal([
			{ quantity: '2', unit_price: '3.5' },
			{ quantity: 1, unit_price: 4 },
		]),
		11,
	)
})

test('treats empty or zero quantity and price values as zero', () => {
	assert.equal(
		serviceLinesTotal([
			{ quantity: 0, unit_price: 9 },
			{ quantity: 5, unit_price: 0 },
			{ quantity: '', unit_price: '' },
		]),
		0,
	)
	assert.equal(serviceLinesTotal([]), 0)
})
