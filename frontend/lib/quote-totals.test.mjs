import assert from 'node:assert/strict'
import { test } from 'vitest'

import { quoteTotalsForForm } from './quote-totals'

test('quoteTotalsForForm calculates a standard quote including discount and tax', () => {
	assert.deepEqual(
		quoteTotalsForForm({
			items: [
				{ quantity: '2', unit_price: '100' },
				{ quantity: '1', unit_price: '50' },
			],
			discount_rate: '10',
			tax_rate: '21',
		}),
		{
			subtotal: 250,
			discountAmount: 25,
			taxableAmount: 225,
			taxAmount: 47.25,
			total: 272.25,
		},
	)
})

test('quoteTotalsForForm uses group vehicle lines and ignores negative rates', () => {
	assert.deepEqual(
		quoteTotalsForForm({
			is_group: true,
			vehicle_lines: [
				{ items: [{ quantity: '1', unit_price: '300' }] },
				{ items: [{ quantity: '2', unit_price: '50' }] },
			],
			discount_rate: '-10',
			tax_rate: '-21',
		}),
		{
			subtotal: 400,
			discountAmount: 0,
			taxableAmount: 400,
			taxAmount: 0,
			total: 400,
		},
	)
})
