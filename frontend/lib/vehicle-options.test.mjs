import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	singleVehicleIdForCustomer,
	validVehicleModelForBrand,
	vehicleBrandOptions,
	vehicleSelectOptions,
	vehiclesForCustomerId,
	vehiclesForOptionalCustomer,
	vehiclesMatchingCustomer,
	vehicleModelOptionsForBrand,
} from './vehicle-options'

test('vehicleBrandOptions combines known brands with historical custom brands', () => {
	const options = vehicleBrandOptions(['Zanella', 'Toyota', ''])

	assert.ok(options.includes('Toyota'))
	assert.ok(options.includes('Ford'))
	assert.ok(options.includes('Zanella'))
	assert.equal(options.filter((value) => value === 'Toyota').length, 1)
})

test('vehicleModelOptionsForBrand filters known and historical models by brand', () => {
	const vehicles = [
		{ brand: 'Toyota', model: 'Etios' },
		{ brand: 'Ford', model: 'Fiesta' },
		{ brand: 'toyota', model: 'Yaris' },
	]

	const toyotaModels = vehicleModelOptionsForBrand('Toyota', vehicles)

	assert.ok(toyotaModels.includes('Corolla'))
	assert.ok(toyotaModels.includes('Hilux'))
	assert.ok(toyotaModels.includes('Etios'))
	assert.ok(toyotaModels.includes('Yaris'))
	assert.equal(toyotaModels.includes('Fiesta'), false)
})

test('vehicleModelOptionsForBrand waits for a brand before listing catalog models', () => {
	const models = vehicleModelOptionsForBrand('', [
		{ brand: 'Toyota', model: 'Corolla' },
	])

	assert.deepEqual(models, [])
	assert.deepEqual(
		vehicleModelOptionsForBrand('', [], ['Modelo legado']),
		['Modelo legado'],
	)
})

test('vehicleModelOptionsForBrand returns only historical models for unknown brand', () => {
	const vehicles = [{ brand: 'Ferrari', model: 'F40' }]
	const models = vehicleModelOptionsForBrand('Ferrari', vehicles)
	assert.deepEqual(models, ['F40'])
})

test('vehicleBrandOptions handles null and undefined entries in historical list', () => {
	const options = vehicleBrandOptions([null, undefined, 'MarcaRara'])
	assert.ok(options.includes('MarcaRara'))
	assert.ok(!options.includes(''))
})

test('keeps only a model available for the selected brand', () => {
	const vehicles = [{ brand: 'Toyota', model: 'Modelo legado' }]
	assert.equal(validVehicleModelForBrand('Toyota', 'Corolla', vehicles), 'Corolla')
	assert.equal(
		validVehicleModelForBrand('Toyota', 'Modelo legado', vehicles),
		'Modelo legado',
	)
	assert.equal(validVehicleModelForBrand('Toyota', 'Fiesta', vehicles), '')
	assert.equal(validVehicleModelForBrand('', 'Corolla', vehicles), '')
	assert.equal(validVehicleModelForBrand('Toyota', null, vehicles), '')
})

test('vehiclesForCustomerId preserves the exact customer match and empty input', () => {
	const vehicles = [
		{ id: 1, customer: 7 },
		{ id: 2, customer: '8' },
	]

	assert.deepEqual(vehiclesForCustomerId(vehicles, '7'), [vehicles[0]])
	assert.deepEqual(vehiclesForCustomerId(vehicles, ''), [])
})

test('vehicle selection helpers preserve blank matches, optional filters and select fields', () => {
	const vehicles = [
		{ id: 0, customer: '', label: 'Sin cliente', customer_name: '' },
		{ id: 1, customer: null, label: 'Sin asignar', customer_name: 'Ana' },
		{ id: 2, customer: 7, label: 'Fiesta', customer_name: 'Beto' },
	]

	assert.deepEqual(vehiclesMatchingCustomer(vehicles, ''), [vehicles[0]])
	assert.deepEqual(vehiclesMatchingCustomer(vehicles, undefined), [])
	assert.equal(vehiclesForOptionalCustomer(vehicles, ''), vehicles)
	assert.deepEqual(vehiclesForOptionalCustomer(vehicles, 7), [vehicles[2]])
	assert.deepEqual(vehicleSelectOptions([vehicles[0], vehicles[2]]), [
		{ value: '0', label: 'Sin cliente', meta: '' },
		{ value: '2', label: 'Fiesta', meta: 'Beto' },
	])
})

test('singleVehicleIdForCustomer selects only a sole vehicle', () => {
	assert.equal(singleVehicleIdForCustomer([{ id: 0, customer: 7 }], '7'), '0')
	assert.equal(
		singleVehicleIdForCustomer(
			[
				{ id: 1, customer: 7 },
				{ id: 2, customer: 7 },
			],
			'7',
		),
		'',
	)
})
