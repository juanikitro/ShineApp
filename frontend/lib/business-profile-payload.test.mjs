import assert from 'node:assert/strict'
import { test } from 'vitest'

import { businessProfilePayload } from './business-profile-payload'

function textEntries(payload) {
	return Object.fromEntries(
		Array.from(payload.entries()).filter(([, value]) => typeof value === 'string'),
	)
}

test('businessProfilePayload preserves settings serialization and normalizations', () => {
	const logo = new File(['logo'], 'logo.png', { type: 'image/png' })
	const payload = businessProfilePayload(
		{
			name: '  Shine  ',
			cuit: 20123456789,
			vat_condition: 'RI',
			contact_phone: '3624',
			contact_email: 'info@example.com',
			address: 'Mitre 1',
			maps_url: 'https://maps.example.com',
			default_quote_validity_days: 14,
			default_quote_tax_rate: 21,
			default_quote_discount_rate: 5,
			default_quote_terms: 'Validez',
			default_quote_payment_instructions: 'Transferencia',
			use_reservation_times: false,
			show_stay_days_in_agenda: false,
			allow_overlapping_reservations: true,
			enforce_capacity_limit: false,
			default_capacity_wash: 12,
			default_capacity_detailing: 6,
			reservation_use_pending: false,
			reservation_use_in_progress: false,
			reservation_use_ready: false,
			reservation_use_canceled: false,
			reservation_auto_charge_on_delivery: true,
			public_landing_enabled: false,
			public_landing_intro: 'Bienvenidos',
			allow_public_booking_requests: false,
			allow_public_quote_requests: false,
			public_hidden_service_ids: ['7', 'x', 0, -1, '2.5'],
			onboarding_dismissed_step_ids: [2, null],
			public_show_service_description: false,
			public_show_service_price: true,
			opening_time: '08:00',
			closing_time: '',
			income_category_tree: { Ventas: [' Mayorista ', 'Mayorista', ''] },
			expense_category_tree: { Compras: [] },
		},
		{ includeLogo: true },
		logo,
	)

	assert.deepEqual(textEntries(payload), {
		name: 'Shine',
		cuit: '20123456789',
		vat_condition: 'RI',
		contact_phone: '3624',
		contact_email: 'info@example.com',
		address: 'Mitre 1',
		maps_url: 'https://maps.example.com',
		default_quote_validity_days: '14',
		default_quote_tax_rate: '21',
		default_quote_discount_rate: '5',
		default_quote_terms: 'Validez',
		default_quote_payment_instructions: 'Transferencia',
		use_reservation_times: 'false',
		show_stay_days_in_agenda: 'false',
		allow_overlapping_reservations: 'true',
		enforce_capacity_limit: 'false',
		default_capacity_wash: '12',
		default_capacity_detailing: '6',
		reservation_use_pending: 'false',
		reservation_use_in_progress: 'false',
		reservation_use_ready: 'false',
		reservation_use_canceled: 'false',
		reservation_auto_charge_on_delivery: 'true',
		public_landing_enabled: 'false',
		public_landing_intro: 'Bienvenidos',
		allow_public_booking_requests: 'false',
		allow_public_quote_requests: 'false',
		public_hidden_service_ids: '[7,2.5]',
		onboarding_dismissed_step_ids: '["2","null"]',
		public_show_service_description: 'false',
		public_show_service_price: 'true',
		opening_time: '08:00',
		closing_time: '',
		income_category_tree: '{"Ventas":["Mayorista"]}',
		expense_category_tree: '{"Compras":[]}',
	})
	assert.equal(payload.get('logo')?.name, 'logo.png')
})

test('businessProfilePayload preserves defaults and skips unavailable logo files', () => {
	const payload = businessProfilePayload(
		{
			public_hidden_service_ids: 'not-an-array',
			onboarding_dismissed_step_ids: null,
			opening_time: null,
			closing_time: undefined,
		},
		{ includeLogo: true },
		null,
	)

	assert.equal(payload.get('name'), '')
	assert.equal(payload.get('default_quote_validity_days'), '7')
	assert.equal(payload.get('default_quote_tax_rate'), '0')
	assert.equal(payload.get('default_capacity_wash'), '8')
	assert.equal(payload.get('default_capacity_detailing'), '4')
	assert.equal(payload.get('use_reservation_times'), 'true')
	assert.equal(payload.get('enforce_capacity_limit'), 'true')
	assert.equal(payload.get('allow_overlapping_reservations'), 'false')
	assert.equal(payload.get('public_hidden_service_ids'), '[]')
	assert.equal(payload.get('onboarding_dismissed_step_ids'), '[]')
	assert.equal(payload.get('opening_time'), '')
	assert.equal(payload.get('closing_time'), '')
	assert.equal(payload.get('logo'), null)
})
