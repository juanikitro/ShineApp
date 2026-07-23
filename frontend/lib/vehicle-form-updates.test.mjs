import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	detailVehiclePatchForBrand,
	vehicleFormWithBrand,
	vehicleFormWithCustomer,
} from './vehicle-form-updates'

const vehicles = [
	{ id: '1', brand: 'Ford', model: 'Fiesta' },
	{ id: '2', brand: 'Marca local', model: 'Especial' },
]

test('vehicle form updates preserve customer and a valid model for its selected brand', () => {
	const form = { customer: '1', brand: 'Ford', model: 'Fiesta', notes: 'ok' }

	assert.deepEqual(vehicleFormWithCustomer(form, '2'), {
		customer: '2',
		brand: 'Ford',
		model: 'Fiesta',
		notes: 'ok',
	})
	assert.equal(form.customer, '1')
	assert.deepEqual(vehicleFormWithBrand(form, 'Ford', vehicles), {
		customer: '1',
		brand: 'Ford',
		model: 'Fiesta',
		notes: 'ok',
	})
})

test('vehicle form updates clear invalid models while preserving historical values and null detail input', () => {
	assert.deepEqual(
		vehicleFormWithBrand({ brand: 'Ford', model: 'Fiesta' }, 'Toyota', vehicles),
		{ brand: 'Toyota', model: '' },
	)
	assert.deepEqual(
		vehicleFormWithBrand({ model: 'Especial' }, 'Marca local', vehicles),
		{ brand: 'Marca local', model: 'Especial' },
	)
	assert.deepEqual(detailVehiclePatchForBrand(null, 'Ford', vehicles), {
		brand: 'Ford',
		model: '',
	})
})
