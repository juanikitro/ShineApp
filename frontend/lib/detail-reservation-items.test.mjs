import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	createDetailReservationItems,
	detailReservationDataWithAddedItem,
	detailReservationDataWithPatchedItem,
	detailReservationDataWithRemovedItem,
	detailReservationItems,
} from './detail-reservation-items'

const services = [
	{ id: 'wash', base_price: '100' },
	{ id: 'detail', base_price: '200' },
]

test('detailReservationItems retains existing rows and creates the legacy fallback row', () => {
	const existingItems = [{ service: 'detail', quantity: '2' }]
	assert.equal(
		detailReservationItems({ items: existingItems, service: 'wash' }, services),
		existingItems,
	)
	assert.deepEqual(detailReservationItems({ service: 'wash' }, services), [
		{ service: 'wash', quantity: '1', unit_price: '100' },
	])
	assert.deepEqual(detailReservationItems({ items: [], service: 'missing' }, services), [
		{ service: 'missing', quantity: '1', unit_price: '' },
	])
})

test('createDetailReservationItems keeps the service catalog bound to the selector', () => {
	const itemsForDetail = createDetailReservationItems(services)
	assert.deepEqual(itemsForDetail({ service: 'wash' }), [
		{ service: 'wash', quantity: '1', unit_price: '100' },
	])
})

test('detail reservation item transforms preserve primary service, zero values and blank fallbacks', () => {
	const data = { service: 'wash', items: [] }
	const blankItem = () => ({ service: '', quantity: '' })

	assert.deepEqual(
		detailReservationDataWithPatchedItem(
			data,
			0,
			{ service: 'detail', quantity: 0 },
			services,
		),
		{
			service: 'detail',
			items: [{ service: 'detail', quantity: 0, unit_price: '100' }],
		},
	)
	assert.equal(
		detailReservationDataWithPatchedItem(
			data,
			0,
			{ service: undefined },
			services,
		).service,
		'wash',
	)
	assert.deepEqual(
		detailReservationDataWithAddedItem(data, services, blankItem).items,
		[
			{ service: 'wash', quantity: '1', unit_price: '100' },
			{ service: '', quantity: '' },
		],
	)
	assert.deepEqual(
		detailReservationDataWithRemovedItem(data, 0, services, blankItem),
		{ service: '', items: [{ service: '', quantity: '' }] },
	)
})
