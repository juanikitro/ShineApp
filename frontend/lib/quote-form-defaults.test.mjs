import assert from 'node:assert/strict'
import { test } from 'vitest'

import { blankQuoteFormWithBusinessDefaults } from './quote-form-defaults'

test('blankQuoteFormWithBusinessDefaults preserves business quote defaults', () => {
	const form = blankQuoteFormWithBusinessDefaults(
		{
			default_quote_validity_days: 10,
			default_quote_tax_rate: 21,
			default_quote_discount_rate: 5,
			default_quote_terms: 'Pago contado',
			default_quote_payment_instructions: 'Transferencia',
		},
		'2026-07-24',
		new Date(2026, 6, 22, 12),
	)

	assert.equal(form.reservation_day, '2026-07-24')
	assert.equal(form.vehicle_lines[0].reservation_day, '2026-07-24')
	assert.equal(form.valid_until, '2026-08-01')
	assert.equal(form.tax_rate, '21')
	assert.equal(form.discount_rate, '5')
	assert.equal(form.terms, 'Pago contado')
	assert.equal(form.payment_instructions, 'Transferencia')
})

test('blankQuoteFormWithBusinessDefaults preserves fallback values for invalid profile settings', () => {
	const form = blankQuoteFormWithBusinessDefaults(
		{
			default_quote_validity_days: 'invalid',
			default_quote_tax_rate: null,
			default_quote_discount_rate: undefined,
		},
		'',
		new Date(2026, 6, 22, 12),
	)

	assert.equal(form.valid_until, '2026-07-29')
	assert.equal(form.tax_rate, '0')
	assert.equal(form.discount_rate, '0')
	assert.equal(form.terms, '')
	assert.equal(form.payment_instructions, '')
})
