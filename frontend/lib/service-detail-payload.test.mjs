import assert from 'node:assert/strict'
import { test } from 'vitest'

import { serviceDetailPayloadFields } from './service-detail-payload'

test('service detail edits include icon in dirty detection and patch payload', () => {
	assert.ok(serviceDetailPayloadFields.includes('icon'))
})
