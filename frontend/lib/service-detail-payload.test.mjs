import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	serviceCreatePayload,
	serviceDetailPayloadFields,
} from './service-detail-payload'

test('service detail edits include icon in dirty detection and patch payload', () => {
	assert.ok(serviceDetailPayloadFields.includes('icon'))
})

test('service detail edits include vehicle-type prices in patch payload', () => {
	for (const field of [
		'price_moto',
		'price_auto',
		'price_camioneta',
		'price_combi',
	]) {
		assert.ok(serviceDetailPayloadFields.includes(field))
	}
})

test('serviceCreatePayload omits template IDs and normalizes blank material cost', () => {
	const form = {
		id: 7,
		name: 'Lavado',
		templateId: 'starter',
		estimated_material_cost: '   ',
	}

	assert.deepEqual(serviceCreatePayload(form), {
		name: 'Lavado',
		estimated_material_cost: null,
	})
	assert.equal(form.templateId, 'starter')
})

test('serviceCreatePayload preserves a provided material cost', () => {
	assert.deepEqual(
		serviceCreatePayload({ name: 'Lavado', estimated_material_cost: '1500' }),
		{ name: 'Lavado', estimated_material_cost: '1500' },
	)
})
