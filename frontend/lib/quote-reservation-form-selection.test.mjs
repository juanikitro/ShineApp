import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	formForCustomerSelection,
	formForVehicleSelection,
} from './quote-reservation-form-selection'

const services = [
	{
		id: 'wash',
		base_price: '100',
		price_auto: '150',
		price_moto: '80',
	},
]

const vehicles = [
	{ id: 'auto-1', customer: 'customer-1', vehicle_type: 'auto' },
	{ id: 'moto-1', customer: 'customer-2', vehicle_type: 'moto' },
]

test('formForCustomerSelection keeps the single-customer vehicle and reprices non-group lines', () => {
	const form = {
		customer: '',
		vehicle: '',
		items: [{ service: 'wash', quantity: '1', unit_price: '' }],
	}

	const result = formForCustomerSelection(
		form,
		'customer-1',
		vehicles,
		services,
	)

	assert.equal(result.vehicle, 'auto-1')
	assert.deepEqual(result.form, {
		customer: 'customer-1',
		vehicle: 'auto-1',
		items: [{ service: 'wash', quantity: '1', unit_price: '150' }],
	})
	assert.equal(form.vehicle, '')
})

test('formForCustomerSelection clears ambiguous vehicles and preserves group new-vehicle lines', () => {
	const ambiguous = formForCustomerSelection(
		{
			customer: '',
			vehicle: 'old',
			items: [{ service: 'wash', unit_price: '999' }],
		},
		'customer-missing',
		vehicles,
		services,
	)
	assert.equal(ambiguous.vehicle, '')
	assert.deepEqual(ambiguous.form.items, [
		{ service: 'wash', unit_price: '100' },
	])

	const group = formForCustomerSelection(
		{
			is_group: true,
			vehicle_lines: [
				{ vehicle: 'auto-1', items: [{ service: 'wash', unit_price: '' }] },
				{
					use_new_vehicle: true,
					new_vehicle: { vehicle_type: 'moto' },
					items: [{ service: 'wash', unit_price: '' }],
				},
			],
		},
		'customer-1',
		vehicles,
		services,
	)

	assert.equal(group.vehicle, '')
	assert.equal(group.form.customer, 'customer-1')
	assert.deepEqual(group.form.vehicle_lines, [
		{ vehicle: '', items: [{ service: 'wash', unit_price: '100' }] },
		{
			use_new_vehicle: true,
			new_vehicle: { vehicle_type: 'moto' },
			items: [{ service: 'wash', unit_price: '80' }],
		},
	])
})

test('formForVehicleSelection reuses the selected vehicle type and supports no items', () => {
	assert.deepEqual(
		formForVehicleSelection(
			{ vehicle: '', items: [{ service: 'wash', unit_price: '' }] },
			'moto-1',
			vehicles,
			services,
		),
		{
			vehicle: 'moto-1',
			items: [{ service: 'wash', unit_price: '80' }],
		},
	)
	assert.deepEqual(
		formForVehicleSelection({}, '', vehicles, services),
		{ vehicle: '', items: [] },
	)
})
