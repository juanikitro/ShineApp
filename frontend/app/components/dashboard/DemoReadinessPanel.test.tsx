import assert from 'node:assert/strict'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, test, vi } from 'vitest'

import { buildDemoReadiness } from '@/lib/demo-readiness'
import { DemoReadinessPanel } from './DemoReadinessPanel'

afterEach(cleanup)

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

function renderPanel(overrides = {}) {
	const props = {
		readiness: buildDemoReadiness({}),
		onDismissStep: vi.fn(),
		onOpenSection: vi.fn(),
		onOpenSettingsSection: vi.fn(),
		...overrides,
	} as Parameters<typeof DemoReadinessPanel>[0]

	return {
		...render(<DemoReadinessPanel {...props} />),
		props,
	}
}

test('DemoReadinessPanel opens the first reservation action from onboarding', async () => {
	const user = userEvent.setup()
	const onCreateFirstReservation = vi.fn()
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
		whatsappConfig: { is_enabled: true, phone_number_display: '+5493624000000' },
	})
	renderPanel({ readiness, onCreateFirstReservation })

	const nextStep = screen.getByText('Siguiente paso').closest('.demo-readiness-next')
	assert.ok(nextStep)
	await user.click(within(nextStep).getByRole('button', { name: 'Crear primer turno' }))

	assert.equal(onCreateFirstReservation.mock.calls.length, 1)
	assert.ok(screen.getByText('Primer recorrido operativo'))
	assert.equal(
		within(screen.getByText('Primer recorrido operativo').closest('.demo-readiness-operation')!).queryByRole(
			'button',
		),
		null,
	)
})

test('DemoReadinessPanel charges the first pending work order when cash is next', async () => {
	const user = userEvent.setup()
	const firstChargeableWorkOrder = { id: 42, balance_due: '15000.00' }
	const onOpenFirstPayment = vi.fn()
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
		workOrders: [firstChargeableWorkOrder],
		whatsappConfig: { is_enabled: true, phone_number_display: '+5493624000000' },
	})
	renderPanel({
		firstChargeableWorkOrder,
		readiness,
		onOpenFirstPayment,
	})

	const nextStep = screen.getByText('Siguiente paso').closest('.demo-readiness-next')
	assert.ok(nextStep)
	await user.click(
		within(nextStep).getByRole('button', { name: 'Cobrar primer trabajo' }),
	)

	assert.equal(onOpenFirstPayment.mock.calls.length, 1)
	assert.equal(onOpenFirstPayment.mock.calls[0][0], firstChargeableWorkOrder)
})

test('DemoReadinessPanel collapses without discarding onboarding progress', async () => {
	const user = userEvent.setup()
	renderPanel()

	const toggle = screen.getByRole('button', { name: 'Contraer alta guiada' })
	const contentId = toggle.getAttribute('aria-controls')
	assert.equal(toggle.getAttribute('aria-expanded'), 'true')
	assert.ok(contentId)

	await user.click(toggle)
	assert.equal(toggle.getAttribute('aria-expanded'), 'false')
	assert.ok(document.getElementById(contentId!)?.hidden)

	await user.click(screen.getByRole('button', { name: 'Expandir alta guiada' }))
	assert.ok(screen.getByText('Negocio listo'))
	assert.ok(screen.getByText('0/6 listo'))
})

test('DemoReadinessPanel renders each step action before its status badge', () => {
	renderPanel()

	const turneraStep = screen.getByText('Turnera publica').closest('.demo-readiness-step')
	assert.ok(turneraStep)
	const action = within(turneraStep).getByRole('button', { name: 'Abrir turnera' })
	const status = within(turneraStep).getByText('Pendiente')
	const children = Array.from(turneraStep.children)

	assert.ok(children.indexOf(action) < children.indexOf(status))
})

test('DemoReadinessPanel exposes a dismiss action for each onboarding step', async () => {
	const user = userEvent.setup()
	const onDismissStep = vi.fn()
	renderPanel({ onDismissStep })

	await user.click(
		screen.getByRole('button', {
			name: 'Descartar Negocio listo de alta guiada',
		}),
	)
	assert.deepEqual(onDismissStep.mock.calls, [])

	await user.click(screen.getByRole('button', { name: 'Quitar paso' }))

	assert.deepEqual(onDismissStep.mock.calls, [['business']])
})

test('DemoReadinessPanel hides when every onboarding step is dismissed', () => {
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
	renderPanel({ readiness })

	assert.equal(screen.queryByRole('heading', { name: 'Alta guiada' }), null)
})
