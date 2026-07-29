import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	apiPathForRecord,
	detailEndpoint,
	detailKindFromTitle,
	isEditableDetailKind,
	shouldStartDetailEditing,
} from './detail-paths'

test('detailKindFromTitle preserves the Spanish detail title map', () => {
	assert.equal(detailKindFromTitle('Cliente'), 'customer')
	assert.equal(detailKindFromTitle('Orden de trabajo'), 'workorder')
	assert.equal(detailKindFromTitle('Pago de deuda'), 'debt-payment')
	assert.equal(detailKindFromTitle('Desconocido'), '')
})

test('detailEndpoint preserves record endpoints and unknown fallback', () => {
	assert.equal(detailEndpoint('customer', 7), '/customers/7/')
	assert.equal(detailEndpoint('fixed-expense', 'fee-1'), '/fixed-expenses/fee-1/')
	assert.equal(detailEndpoint('unknown', 7), undefined)
})

test('apiPathForRecord preserves detail and undo-specific endpoints', () => {
	assert.equal(apiPathForRecord('quote', 0), '/quotes/0/')
	assert.equal(apiPathForRecord('payment', 9), '/payments/9/')
	assert.equal(apiPathForRecord('stock-movement', 3), '/stock-movements/3/')
	assert.equal(apiPathForRecord('material-open-unit', 4), '/material-open-units/4/')
})

test('apiPathForRecord omits missing identifiers and unknown paths', () => {
	assert.equal(apiPathForRecord('customer', ''), '')
	assert.equal(apiPathForRecord('customer', null), '')
	assert.equal(apiPathForRecord('customer', undefined), '')
	assert.equal(apiPathForRecord('unknown', 7), '')
})

test('isEditableDetailKind preserves the editable detail type catalog', () => {
	assert.equal(isEditableDetailKind('customer'), true)
	assert.equal(isEditableDetailKind('debt-payment'), true)
	assert.equal(isEditableDetailKind('fixed-expense'), false)
	assert.equal(isEditableDetailKind('unknown'), false)
})

test('shouldStartDetailEditing opens every reservation directly in its editor', () => {
	assert.equal(shouldStartDetailEditing('reservation', false), true)
	assert.equal(shouldStartDetailEditing('reservation', undefined), true)
	assert.equal(shouldStartDetailEditing('customer', true), true)
	assert.equal(shouldStartDetailEditing('customer', false), false)
})
