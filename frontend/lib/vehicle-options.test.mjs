import assert from 'node:assert/strict'
import { test } from 'vitest'

import { vehicleBrandOptions, vehicleModelOptionsForBrand } from './vehicle-options'

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
