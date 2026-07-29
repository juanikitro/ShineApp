import assert from 'node:assert/strict'
import { test } from 'vitest'

import { quoteDetailViewModel } from './quote-detail-view-model'

const vehicles = [
	{ id: 1, customer: '10', label: 'Ford Fiesta', customer_name: 'Ana' },
	{ id: 2, customer: 20, label: 'Toyota Etios', customer_name: 'Beto' },
]
const vehicleOptions = [
	{ value: '1', label: 'Ford Fiesta', meta: 'Ana' },
	{ value: '2', label: 'Toyota Etios', meta: 'Beto' },
]

test('quoteDetailViewModel preserves draft group details and filters vehicles by customer', () => {
	const viewModel = quoteDetailViewModel(
		{
			id: 3,
			public_code: 'Q-003',
			status: 'draft',
			is_group: true,
			customer: 10,
			vehicle_lines: [],
		},
		{ draft: 'Sin enviar' },
		vehicles,
		vehicleOptions,
	)

	assert.equal(viewModel.code, 'Q-003')
	assert.equal(viewModel.quoteStatusLabel, 'Sin enviar')
	assert.equal(viewModel.hasReservation, false)
	assert.equal(viewModel.groupCanEdit, true)
	assert.equal(viewModel.groupLines.length, 1)
	assert.deepEqual(viewModel.groupVehicleOptions, [vehicleOptions[0]])
})

test('quoteDetailViewModel keeps explicit status labels and the original options without a customer', () => {
	const viewModel = quoteDetailViewModel(
		{
			id: 4,
			status: 'accepted',
			status_label: 'Aceptada por cliente',
			is_group: false,
		},
		{ accepted: 'Aceptada' },
		vehicles,
		vehicleOptions,
	)

	assert.equal(viewModel.code, '#4')
	assert.equal(viewModel.quoteStatusLabel, 'Aceptada por cliente')
	assert.equal(viewModel.hasReservation, false)
	assert.equal(viewModel.groupCanEdit, false)
	assert.deepEqual(viewModel.groupLines, [])
	assert.equal(viewModel.groupVehicleOptions, vehicleOptions)
})

test('quoteDetailViewModel blocks a grouped quote with an existing reservation', () => {
	const viewModel = quoteDetailViewModel(
		{
			id: 5,
			status: 'draft',
			is_group: true,
			customer: '20',
			reservation: 8,
			vehicle_lines: [{ vehicle: 2 }],
		},
		{ draft: 'Sin enviar' },
		vehicles,
		vehicleOptions,
	)

	assert.equal(viewModel.hasReservation, true)
	assert.equal(viewModel.groupCanEdit, false)
	assert.deepEqual(viewModel.groupVehicleOptions, [vehicleOptions[1]])
})
