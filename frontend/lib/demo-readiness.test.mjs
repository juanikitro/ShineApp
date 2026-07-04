import assert from 'node:assert/strict'
import { test } from 'vitest'

import { buildDemoReadiness } from './demo-readiness'

const coreSectors = [
	{ id: 1, key: 'lavadero', name: 'Lavadero', is_active: true },
	{ id: 2, key: 'detailing', name: 'Detailing', is_active: true },
	{ id: 3, key: 'lubricentro', name: 'Lubricentro', is_active: true },
]

const coreServices = [
	{ id: 1, name: 'Lavado premium', is_active: true },
	{ id: 2, name: 'Detailing interior', is_active: true },
	{ id: 3, name: 'Cambio de aceite', is_active: true },
]

test('guides an empty real business from the first setup step', () => {
	const readiness = buildDemoReadiness({})

	assert.equal(readiness.completedCount, 0)
	assert.equal(readiness.percent, 0)
	assert.equal(readiness.ready, false)
	assert.equal(readiness.firstPendingStep?.id, 'business')
})

test('marks demo data as sellable but keeps WhatsApp pending when disabled', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			name: 'Shine Car Detail Studio',
			contact_phone: '+5493624000000',
			public_landing_enabled: true,
			allow_public_booking_requests: true,
		},
		businessSlug: 'shine-car-detail-studio',
		sectors: coreSectors,
		services: coreServices,
		reservations: [{ id: 1, is_active: true }],
		payments: [{ id: 1, is_active: true }],
		whatsappConfig: { is_enabled: false },
	})

	assert.equal(readiness.completedCount, 5)
	assert.equal(readiness.ready, false)
	assert.equal(readiness.firstPendingStep?.id, 'whatsapp')
})

test('returns a ready checklist when every commercial surface is configured', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			name: 'Shine Car Detail Studio',
			contact_phone: '+5493624000000',
			public_landing_enabled: true,
			allow_public_booking_requests: true,
		},
		businessSlug: 'shine-car-detail-studio',
		dashboard: { collected_total: '120000.00' },
		sectors: coreSectors,
		services: coreServices,
		reservations: [{ id: 1, is_active: true }],
		whatsappConfig: { is_enabled: true, phone_number_display: '+5493624000000' },
	})

	assert.equal(readiness.completedCount, readiness.totalCount)
	assert.equal(readiness.percent, 100)
	assert.equal(readiness.ready, true)
	assert.equal(readiness.firstPendingStep, null)
})
