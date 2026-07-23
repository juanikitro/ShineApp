import assert from 'node:assert/strict'
import { test } from 'vitest'

import { filterCustomersForList } from './customer-list-filters'

const customers = [
	{
		id: 1,
		name: 'Ana',
		phone: '3624',
		list_insights: {
			has_upcoming_reservation: true,
			has_balance_due: false,
			last_service_name: 'Lavado premium',
		},
	},
	{
		id: 2,
		name: 'Beto',
		has_birthday_alert: true,
		list_insights: {
			has_upcoming_reservation: false,
			has_balance_due: false,
			last_vehicle_label: 'Hilux',
		},
	},
	{
		id: 3,
		name: 'Carla',
		list_insights: {
			has_upcoming_reservation: false,
			has_balance_due: true,
		},
	},
]

const vehicleTerms = new Map([
	['1', ['Ford', 'Focus']],
	['3', ['AA 123']],
])

function ids(filter, search = '') {
	return filterCustomersForList(customers, filter, search, vehicleTerms).map(
		(customer) => customer.id,
	)
}

test('filterCustomersForList preserves each customer-card filter branch', () => {
	assert.deepEqual(ids('all'), [1, 2, 3])
	assert.deepEqual(ids('with_reservation'), [1])
	assert.deepEqual(ids('birthday_soon'), [2])
	assert.deepEqual(ids('no_upcoming'), [2, 3])
	assert.deepEqual(ids('with_balance'), [3])
})

test('filterCustomersForList matches search text from customer, vehicle and insights', () => {
	assert.deepEqual(ids('all', ' focus '), [1])
	assert.deepEqual(ids('all', 'LAVADO'), [1])
	assert.deepEqual(ids('all', 'aa 123'), [3])
	assert.deepEqual(ids('all', 'hilux'), [2])
})

test('filterCustomersForList applies the card filter before a matching search term', () => {
	assert.deepEqual(ids('with_balance', 'ana'), [])
})
