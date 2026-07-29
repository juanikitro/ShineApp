import assert from 'node:assert/strict'
import { test } from 'vitest'

import { buildDemoReadiness, findFirstChargeableWorkOrder } from './demo-readiness'

const coreSectors = [
	{ id: 1, key: 'lavadero', name: 'Lavadero', is_active: true },
	{ id: 2, key: 'detailing', name: 'Detailing', is_active: true },
	{ id: 3, key: 'lubricentro', name: 'Lubricentro', is_active: true },
]

const coreServices = [
	{ id: 1, name: 'Lavado exterior express', sector: 1, is_active: true },
	{ id: 2, name: 'Lavado completo', sector: 1, is_active: true },
	{ id: 3, name: 'Lavado premium', sector: 1, is_active: true },
]

test('guides an empty real business from the first setup step', () => {
	const readiness = buildDemoReadiness({})

	assert.equal(readiness.completedCount, 0)
	assert.equal(readiness.remainingCount, readiness.totalCount)
	assert.equal(readiness.percent, 0)
	assert.equal(readiness.ready, false)
	assert.equal(readiness.mode, 'onboarding')
	assert.equal(readiness.firstPendingStep?.id, 'business')
	assert.match(readiness.nextStepHint, /Negocio listo/)
})

test('marks demo data as sellable but keeps WhatsApp pending when disabled', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			name: 'Shine Car Detail Studio',
			contact_phone: '+5493624000000',
			business_type: 'lavadero',
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
	assert.equal(readiness.remainingCount, 1)
	assert.equal(readiness.ready, false)
	assert.equal(readiness.mode, 'onboarding')
	assert.equal(readiness.firstPendingStep?.id, 'whatsapp')
})

test('excludes dismissed onboarding steps from the progress count', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			name: 'Shine Car Detail Studio',
			contact_phone: '+5493624000000',
			business_type: 'lavadero',
			public_landing_enabled: true,
			allow_public_booking_requests: true,
			onboarding_dismissed_step_ids: ['whatsapp'],
		},
		businessSlug: 'shine-car-detail-studio',
		sectors: coreSectors,
		services: coreServices,
		reservations: [{ id: 1, is_active: true }],
		whatsappConfig: { is_enabled: false },
	})

	assert.equal(readiness.completedCount, 4)
	assert.equal(readiness.totalCount, 5)
	assert.equal(readiness.remainingCount, 1)
	assert.equal(readiness.percent, 80)
	assert.equal(readiness.firstPendingStep?.id, 'cash-dashboard')
	assert.equal(readiness.steps.some((step) => step.id === 'whatsapp'), false)
})

test('returns an empty checklist when every onboarding step is dismissed', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			onboarding_dismissed_step_ids: [
				'business',
				'services',
				'turnera',
				'whatsapp',
				'agenda',
				'cash-dashboard',
			],
		},
	})

	assert.equal(readiness.completedCount, 0)
	assert.equal(readiness.totalCount, 0)
	assert.equal(readiness.remainingCount, 0)
	assert.equal(readiness.percent, 0)
	assert.equal(readiness.ready, false)
	assert.equal(readiness.firstPendingStep, null)
	assert.deepEqual(readiness.steps, [])
})

test('returns a ready checklist when every commercial surface is configured', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			name: 'Shine Car Detail Studio',
			contact_phone: '+5493624000000',
			business_type: 'lavadero',
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
	assert.equal(readiness.remainingCount, 0)
	assert.equal(readiness.percent, 100)
	assert.equal(readiness.ready, true)
	assert.equal(readiness.mode, 'sellable')
	assert.equal(readiness.firstPendingStep, null)
	assert.match(readiness.nextStepHint, /lista para vender/)
})

test('uses linked onboarding task states instead of recalculating the dashboard checklist', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			name: 'Negocio',
			contact_phone: '+54 11 5555',
			business_type: 'lavadero',
		},
		businessSlug: 'negocio',
		onboardingTasks: [
			{ onboarding_step_id: 'business', status: 'done' },
			{ onboarding_step_id: 'services', status: 'pending' },
			{ onboarding_step_id: 'turnera', status: 'done' },
			{ onboarding_step_id: 'whatsapp', status: 'done' },
			{ onboarding_step_id: 'agenda', status: 'done' },
			{ onboarding_step_id: 'cash-dashboard', status: 'done' },
		],
	})

	assert.equal(readiness.completedCount, 5)
	assert.equal(readiness.firstPendingStep?.id, 'services')
})

test('does not let completed onboarding tasks bypass business type or starter pack', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			name: 'Negocio',
			contact_phone: '+54 11 5555',
		},
		businessSlug: 'negocio',
		onboardingTasks: [
			{ onboarding_step_id: 'business', status: 'done' },
			{ onboarding_step_id: 'services', status: 'done' },
		],
	})

	assert.equal(readiness.steps.find((step) => step.id === 'business')?.done, false)
	assert.equal(readiness.steps.find((step) => step.id === 'services')?.done, false)
})

test('keeps business setup pending until its main type is selected', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			name: 'Shine Car Detail Studio',
			contact_phone: '+5493624000000',
		},
		businessSlug: 'shine-car-detail-studio',
		sectors: coreSectors,
		services: coreServices,
	})

	const businessStep = readiness.steps.find((step) => step.id === 'business')
	assert.equal(businessStep?.done, false)
	assert.deepEqual(businessStep?.target, { kind: 'settings', section: 'business' })
})

test('requires all active services from the selected pack in its sector', () => {
	const readiness = buildDemoReadiness({
		businessProfile: {
			business_type: 'lavadero',
		},
		sectors: coreSectors,
		services: [
			...coreServices.slice(0, 2),
			{ id: 3, name: 'Lavado premium', sector: 2, is_active: true },
		],
	})

	assert.equal(
		readiness.steps.find((step) => step.id === 'services')?.done,
		false,
	)
})

test('findFirstChargeableWorkOrder skips inactive paid or canceled work orders', () => {
	const workOrder = findFirstChargeableWorkOrder([
		{ id: 1, balance_due: '2500.00', is_active: false },
		{ id: 2, balance_due: '0.00', total_amount: '12000.00', paid_amount: '12000.00' },
		{ id: 3, balance_due: '9000.00', status: 'canceled' },
		{ id: 4, total_amount: '18000.00', paid_amount: '6000.00', status: 'ready' },
	])

	assert.equal(workOrder?.id, 4)
})

test('findFirstChargeableWorkOrder prefers explicit pending balance', () => {
	const workOrder = findFirstChargeableWorkOrder([
		{ id: 5, balance_due: '4500.00', total_amount: '1000.00', paid_amount: '1000.00' },
		{ id: 6, total_amount: '8000.00', paid_amount: '0.00' },
	])

	assert.equal(workOrder?.id, 5)
})
