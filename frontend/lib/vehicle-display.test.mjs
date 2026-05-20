import assert from 'node:assert/strict'
import { test } from 'vitest'

import { vehicleDescriptionText, vehicleDisplayTitle, vehicleMatchesSearch } from './vehicle-display'

test('vehicleDisplayTitle uses brand and model when license plate is empty', () => {
	assert.equal(
		vehicleDisplayTitle({
			license_plate: '',
			brand: 'Toyota',
			model: 'Corolla',
		}),
		'Toyota Corolla',
	)
})

test('vehicleMatchesSearch includes brand and color for vehicles without plate', () => {
	const vehicle = {
		license_plate: '',
		brand: 'Marca nueva',
		model: 'Modelo nuevo',
		color: 'Verde',
		customer_name: 'Cliente',
	}

	assert.equal(vehicleMatchesSearch(vehicle, 'marca nueva'), true)
	assert.equal(vehicleMatchesSearch(vehicle, 'verde'), true)
	assert.equal(vehicleDescriptionText(vehicle), 'Marca nueva Modelo nuevo - Verde - Cliente')
})
