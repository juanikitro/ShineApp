import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	clearPublicRequestSelection,
	patchPublicRequestSelection,
	publicRequestConversionPayload,
	publicRequestSelectionForId,
} from './public-request-selection'

test('publicRequestSelectionForId resolves string-compatible request ids', () => {
	const selections = { '7': { customer: '3' } }

	assert.equal(publicRequestSelectionForId(selections, 7), selections['7'])
	assert.deepEqual(publicRequestSelectionForId(selections, 8), {})
})

test('patchPublicRequestSelection preserves existing choices and unrelated requests', () => {
	const current = {
		'7': { customer: '3' },
		'8': { vehicle: '9' },
	}

	assert.deepEqual(patchPublicRequestSelection(current, 7, { vehicle: '4' }), {
		'7': { customer: '3', vehicle: '4' },
		'8': { vehicle: '9' },
	})
})

test('publicRequestConversionPayload preserves optional numeric conversion', () => {
	assert.deepEqual(
		publicRequestConversionPayload({ customer: '0', vehicle: '4' }),
		{ customer: 0, vehicle: 4 },
	)
	assert.deepEqual(publicRequestConversionPayload({ customer: '', vehicle: '' }), {})
})

test('clearPublicRequestSelection removes only the converted request', () => {
	const current = {
		'7': { customer: '3' },
		'8': { vehicle: '9' },
	}

	assert.deepEqual(clearPublicRequestSelection(current, 7), {
		'8': { vehicle: '9' },
	})
	assert.deepEqual(current, {
		'7': { customer: '3' },
		'8': { vehicle: '9' },
	})
})
