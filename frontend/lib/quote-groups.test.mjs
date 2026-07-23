import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
	MAX_GROUP_VEHICLE_LINES,
	blankGroupVehicleLine,
	groupReservationMode,
	groupVehicleLineTotal,
	groupVehicleLinePayload,
	groupVehicleLinesSubtotal,
	repriceGroupVehicleLine,
	validateGroupVehicleLines,
} from './quote-groups.ts'

const services = [
	{
		id: 10,
		name: 'Lavado premium',
		base_price: '15000.00',
		price_moto: '8000.00',
		price_camioneta: '20000.00',
	},
]

const vehicles = [
	{ id: 1, vehicle_type: 'moto' },
	{ id: 2, vehicle_type: 'camioneta' },
]

describe('quote group helpers', () => {
	test('totals group service lines and accepts missing items', () => {
		assert.equal(
			groupVehicleLineTotal({
				items: [{ quantity: '2', unit_price: '3.5' }],
			}),
			7,
		)
		assert.equal(groupVehicleLineTotal({}), 0)
	})

	test('detects quote, reservation and mixed group modes', () => {
		assert.equal(
			groupReservationMode([
				blankGroupVehicleLine({ vehicle: '1' }),
				blankGroupVehicleLine({ vehicle: '2' }),
			]),
			'quote',
		)
		assert.equal(
			groupReservationMode([
				blankGroupVehicleLine({ vehicle: '1', reservation_day: '2026-08-10' }),
				blankGroupVehicleLine({ vehicle: '2', reservation_day: '2026-08-10' }),
			]),
			'reservation',
		)
		assert.equal(
			groupReservationMode([
				blankGroupVehicleLine({ vehicle: '1', reservation_day: '2026-08-10' }),
				blankGroupVehicleLine({ vehicle: '2' }),
			]),
			'mixed',
		)
	})

	test('builds vehicle line payload with existing and inline vehicles', () => {
		const payload = groupVehicleLinePayload(
			[
				blankGroupVehicleLine({
					vehicle: '1',
					reservation_day: '2026-08-10',
					items: [{ service: '10', quantity: '1', unit_price: '' }],
				}),
				blankGroupVehicleLine({
					use_new_vehicle: true,
					new_vehicle: {
						license_plate: ' aa123aa ',
						brand: 'Toyota',
						model: 'Hilux',
						color: '',
						vehicle_type: 'camioneta',
					},
					items: [{ service: '10', quantity: '1', unit_price: '' }],
				}),
			],
			services,
			vehicles,
		)

		assert.equal(payload[0].vehicle, '1')
		assert.equal(payload[0].reservation_day, '2026-08-10')
		assert.equal(payload[0].items[0].unit_price, '8000.00')
		assert.equal(payload[1].new_vehicle.license_plate, 'aa123aa')
		assert.equal(payload[1].items[0].unit_price, '20000.00')
	})

	test('reprices and totals lines by vehicle type', () => {
		const line = blankGroupVehicleLine({
			vehicle: '2',
			items: [{ service: '10', quantity: '2', unit_price: '' }],
		})
		const repriced = repriceGroupVehicleLine(line, vehicles, services)

		assert.equal(repriced.items[0].unit_price, '20000.00')
		assert.equal(groupVehicleLinesSubtotal([repriced]), 40000)
	})

	test('validates max size, mixed dates and new vehicle identity', () => {
		const tooMany = Array.from({ length: MAX_GROUP_VEHICLE_LINES + 1 }, () =>
			blankGroupVehicleLine({ vehicle: '1', items: [{ service: '10' }] }),
		)
		assert.match(validateGroupVehicleLines(tooMany)[0].message, /maximo/)

		const mixed = validateGroupVehicleLines([
			blankGroupVehicleLine({ vehicle: '1', reservation_day: '2026-08-10', items: [{ service: '10' }] }),
			blankGroupVehicleLine({ vehicle: '2', items: [{ service: '10' }] }),
		])
		assert.equal(mixed.some((error) => error.path === 'vehicle_lines'), true)

		const missingIdentity = validateGroupVehicleLines([
			blankGroupVehicleLine({
				use_new_vehicle: true,
				new_vehicle: { vehicle_type: 'auto' },
				items: [{ service: '10' }],
			}),
		])
		assert.equal(
			missingIdentity.some((error) => error.path === 'vehicle_lines.0.new_vehicle'),
			true,
		)
	})
})
