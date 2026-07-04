import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
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
	{ id: 1, name: 'Lavado premium', is_active: true },
	{ id: 2, name: 'Detailing interior', is_active: true },
	{ id: 3, name: 'Cambio de aceite', is_active: true },
]

function renderPanel(overrides = {}) {
	const props = {
		readiness: buildDemoReadiness({}),
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
			public_landing_enabled: true,
			allow_public_booking_requests: true,
		},
		businessSlug: 'shine-car-detail-studio',
		sectors: coreSectors,
		services: coreServices,
		whatsappConfig: { is_enabled: true, phone_number_display: '+5493624000000' },
	})
	renderPanel({ readiness, onCreateFirstReservation })

	await user.click(screen.getAllByRole('button', { name: 'Crear primer turno' })[0])

	assert.equal(onCreateFirstReservation.mock.calls.length, 1)
	assert.ok(screen.getByText('Primer recorrido operativo'))
})

test('DemoReadinessPanel charges the first pending work order when cash is next', async () => {
	const user = userEvent.setup()
	const firstChargeableWorkOrder = { id: 42, balance_due: '15000.00' }
	const onOpenFirstPayment = vi.fn()
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
		workOrders: [firstChargeableWorkOrder],
		whatsappConfig: { is_enabled: true, phone_number_display: '+5493624000000' },
	})
	renderPanel({
		firstChargeableWorkOrder,
		readiness,
		onOpenFirstPayment,
	})

	await user.click(screen.getAllByRole('button', { name: 'Cobrar primer trabajo' })[0])

	assert.equal(onOpenFirstPayment.mock.calls.length, 1)
	assert.equal(onOpenFirstPayment.mock.calls[0][0], firstChargeableWorkOrder)
})
