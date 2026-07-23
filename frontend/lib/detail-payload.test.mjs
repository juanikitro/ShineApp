import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	cleanDetailPayload,
	createDetailPayloadHelpers,
	normalizedDetailPayload,
} from './detail-payload'

const sources = {
	services: [{ id: 1, name: 'Lavado', base_price: '1500' }],
	vehicles: [{ id: 10, vehicle_type: 'auto' }],
}

test('cleanDetailPayload keeps only allowed fields and normalizes customer birthdays', () => {
	assert.deepEqual(
		cleanDetailPayload(
			'customer',
			{
				name: 'Ana',
				birthday_month: '7',
				birthday_day: '',
				internal_flag: true,
			},
			sources,
		),
		{
			name: 'Ana',
			birthday_month: 7,
			birthday_day: null,
		},
	)
	assert.deepEqual(cleanDetailPayload('missing', { name: 'Ana' }, sources), {})
})

test('cleanDetailPayload normalizes reservation service lines and optional schedule values', () => {
	assert.deepEqual(
		cleanDetailPayload(
			'reservation',
			{
				customer: '1',
				service: 'obsolete',
				items: [{ service: '1', quantity: '', unit_price: '' }],
				start_time: '',
				exit_day: '',
				exit_time: '',
				status: 'confirmed',
			},
			sources,
		),
		{
			customer: '1',
			service: '1',
			items: [
				{
					service: '1',
					description: 'Lavado',
					quantity: '1',
					unit_price: '1500',
				},
			],
			start_time: null,
			exit_day: null,
			exit_time: null,
			status: 'confirmed',
		},
	)
})

test('cleanDetailPayload preserves group quote conversion and removes group-only fields otherwise', () => {
	const grouped = cleanDetailPayload(
		'quote',
		{
			is_group: true,
			vehicle_lines: [
				{
					vehicle: '10',
					reservation_day: '',
					reservation_exit_day: '',
					reservation_start_time: '',
					reservation_exit_time: '',
					notes: '',
					items: [{ service: '1' }],
				},
			],
			valid_until: '',
			tax_rate: '',
			discount_rate: '',
		},
		sources,
	)

	assert.deepEqual(grouped, {
		is_group: true,
		vehicle_lines: [
			{
				vehicle: '10',
				reservation_day: null,
				reservation_exit_day: null,
				reservation_start_time: null,
				reservation_exit_time: null,
				notes: '',
				items: [
					{
						service: '1',
						description: 'Lavado',
						quantity: '1',
						unit_price: '1500',
					},
				],
			},
		],
		valid_until: null,
		tax_rate: '0',
		discount_rate: '0',
	})
	assert.deepEqual(
		cleanDetailPayload(
			'quote',
			{ is_group: false, vehicle_lines: [{ vehicle: '10' }], tax_rate: '21' },
			sources,
		),
		{ valid_until: null, tax_rate: '21', discount_rate: '0' },
	)
})

test('cleanDetailPayload keeps each detail-specific null conversion', () => {
	assert.deepEqual(
		cleanDetailPayload(
			'service',
			{ name: 'Lavado', estimated_material_cost: '  ' },
			sources,
		),
		{ name: 'Lavado', estimated_material_cost: null },
	)
	assert.deepEqual(
		cleanDetailPayload(
			'workorder',
			{ status: 'ready', estimated_delivery_at: '' },
			sources,
		),
		{ status: 'ready', estimated_delivery_at: null },
	)
	assert.deepEqual(
		cleanDetailPayload(
			'tool',
			{ name: 'Pulidora', purchased_at: '' },
			sources,
		),
		{ name: 'Pulidora', purchased_at: null },
	)
	assert.deepEqual(
		cleanDetailPayload(
			'debt',
			{ concept: 'Proveedor', due_date: '', supplier: '' },
			sources,
		),
		{ concept: 'Proveedor', due_date: null, supplier: null },
	)
})

test('normalizedDetailPayload preserves comparison serialization rules', () => {
	assert.deepEqual(
		normalizedDetailPayload(
			'reservation',
			{
				items: [{ service: '1' }],
				start_time: '09:30:15',
				exit_time: '10:45:00',
			},
			sources,
		),
		{
			items: JSON.stringify([
				{
					service: '1',
					description: 'Lavado',
					quantity: '1',
					unit_price: '1500',
				},
			]),
			start_time: '09:30',
			exit_time: '10:45',
			exit_day: '',
			service: '1',
		},
	)
	assert.deepEqual(
		normalizedDetailPayload(
			'workorder',
			{ estimated_delivery_at: '2026-07-22T13:45:30' },
			sources,
		),
		{ estimated_delivery_at: '2026-07-22T13:45' },
	)
	assert.deepEqual(
		normalizedDetailPayload(
			'cash-movement',
			{ occurred_at: '2026-07-22T13:45:30', amount: 0, adjusts_closed_day: null },
			sources,
		),
		{ occurred_at: '2026-07-22T13:45', amount: '0', adjusts_closed_day: '' },
	)
})

test('createDetailPayloadHelpers keeps its payload sources bound to both callbacks', () => {
	const helpers = createDetailPayloadHelpers(sources)
	assert.deepEqual(
		helpers.cleanDetailPayload('reservation', {
			items: [{ service: '1', quantity: '1', unit_price: '10' }],
		}),
		{
			items: [
				{
					service: '1',
					description: 'Lavado',
					quantity: '1',
					unit_price: '10',
				},
			],
			service: '1',
			start_time: null,
			exit_day: null,
			exit_time: null,
		},
	)
	assert.deepEqual(
		helpers.normalizedDetailPayload('tool', { name: 'Pulidora' }),
		{ name: 'Pulidora', purchased_at: '' },
	)
})
