import assert from 'node:assert/strict'
import { test } from 'vitest'

import { serviceDetailPayloadFields } from './service-detail-payload'

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
