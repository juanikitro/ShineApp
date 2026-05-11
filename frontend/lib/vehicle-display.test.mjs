import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadVehicleDisplayModule() {
	const sourcePath = resolve('lib/vehicle-display.ts')
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

const {
	vehicleDescriptionText,
	vehicleDisplayTitle,
	vehicleMatchesSearch,
} = loadVehicleDisplayModule()

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
