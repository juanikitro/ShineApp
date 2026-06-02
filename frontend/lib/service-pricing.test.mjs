import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	servicePriceForVehicleType,
	vehicleTypeForId,
	applyBasePriceToTypes,
	repriceItemsForVehicle,
	VEHICLE_TYPE_PRICE_FIELDS,
	VEHICLE_TYPE_OPTIONS,
} from './service-pricing'

const service = {
	id: 1,
	base_price: '15000.00',
	price_moto: '8000.00',
	price_auto: '15000.00',
	price_camioneta: '20000.00',
	price_combi: '25000.00',
	price_camion: '30000.00',
}

test('servicePriceForVehicleType returns the typed price', () => {
	assert.equal(servicePriceForVehicleType(service, 'moto'), '8000.00')
	assert.equal(servicePriceForVehicleType(service, 'combi'), '25000.00')
	assert.equal(servicePriceForVehicleType(service, 'camion'), '30000.00')
})

test('servicePriceForVehicleType falls back to base when type missing or unset', () => {
	const onlyBase = { base_price: '12000.00', price_moto: '5000.00' }
	assert.equal(servicePriceForVehicleType(onlyBase, 'camioneta'), '12000.00')
	assert.equal(servicePriceForVehicleType(onlyBase, ''), '12000.00')
	assert.equal(servicePriceForVehicleType(onlyBase, undefined), '12000.00')
	assert.equal(servicePriceForVehicleType(onlyBase, 'tractor'), '12000.00')
	assert.equal(servicePriceForVehicleType(onlyBase, 'moto'), '5000.00')
})

test('servicePriceForVehicleType respects a typed price of zero', () => {
	const freeMoto = { base_price: '10000.00', price_moto: '0' }
	assert.equal(servicePriceForVehicleType(freeMoto, 'moto'), '0')
})

test('servicePriceForVehicleType returns empty string when there is no price', () => {
	assert.equal(servicePriceForVehicleType({}, 'moto'), '')
	assert.equal(servicePriceForVehicleType(null, 'moto'), '')
})

test('vehicleTypeForId finds the vehicle type by id', () => {
	const vehicles = [
		{ id: 1, vehicle_type: 'moto' },
		{ id: 2, vehicle_type: 'combi' },
	]
	assert.equal(vehicleTypeForId(vehicles, 2), 'combi')
	assert.equal(vehicleTypeForId(vehicles, '1'), 'moto')
	assert.equal(vehicleTypeForId(vehicles, ''), '')
	assert.equal(vehicleTypeForId(vehicles, 99), '')
})

test('applyBasePriceToTypes copies base into empty type prices', () => {
	const form = {
		base_price: '',
		price_moto: '',
		price_auto: '',
		price_camioneta: '',
		price_combi: '',
	}
	const next = applyBasePriceToTypes(form, '10000')
	for (const field of VEHICLE_TYPE_PRICE_FIELDS) {
		assert.equal(next[field], '10000')
	}
	assert.equal(next.base_price, '10000')
})

test('applyBasePriceToTypes keeps manually edited type prices', () => {
	const form = {
		base_price: '10000',
		price_moto: '6000', // editado a mano
		price_auto: '10000', // replicaba el base anterior
		price_camioneta: '10000',
		price_combi: '10000',
	}
	const next = applyBasePriceToTypes(form, '12000')
	assert.equal(next.price_moto, '6000') // respetado
	assert.equal(next.price_auto, '12000') // re-copiado
	assert.equal(next.price_combi, '12000')
	assert.equal(next.base_price, '12000')
})

test('repriceItemsForVehicle re-resolves unit_price only for service lines', () => {
	const items = [
		{ service: 1, quantity: '1.00', unit_price: '15000.00' },
		{ service: '', quantity: '1.00', unit_price: '500.00' },
	]
	const next = repriceItemsForVehicle(items, 'camioneta', [service])
	assert.equal(next[0].unit_price, '20000.00')
	assert.equal(next[1].unit_price, '500.00')
})

test('repriceItemsForVehicle keeps unit_price when service id is not in the catalog', () => {
	const items = [{ service: 999, quantity: '1.00', unit_price: '500.00' }]
	const next = repriceItemsForVehicle(items, 'auto', [service])
	assert.equal(next[0].unit_price, '500.00')
})

test('VEHICLE_TYPE_OPTIONS keeps moto/auto/camioneta/combi/camion order', () => {
	assert.deepEqual(
		VEHICLE_TYPE_OPTIONS.map((option) => option.value),
		['moto', 'auto', 'camioneta', 'combi', 'camion'],
	)
})
