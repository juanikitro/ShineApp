import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadVehicleOptionsModule() {
	const sourcePath = resolve('lib/vehicle-options.ts')
	const source = readFileSync(sourcePath, 'utf8')
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	}).outputText
	const module = { exports: {} }
	const loader = new Function('exports', 'module', compiled)
	loader(module.exports, module)
	return module.exports
}

const { vehicleBrandOptions, vehicleModelOptionsForBrand } =
	loadVehicleOptionsModule()

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
