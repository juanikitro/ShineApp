import assert from 'node:assert/strict'
import { test } from 'vitest'

import { urlBase64ToUint8Array } from './push-subscription'

test('converts URL-safe Base64 without explicit padding to VAPID bytes', () => {
	assert.deepEqual([...urlBase64ToUint8Array('AQID-_8')], [1, 2, 3, 251, 255])
})

test('accepts Base64 values that already have or omit padding', () => {
	assert.deepEqual([...urlBase64ToUint8Array('AQI')], [1, 2])
	assert.deepEqual([...urlBase64ToUint8Array('AQI=')], [1, 2])
})
