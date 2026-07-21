import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { buildDemoReadiness, type DemoReadiness } from '@/lib/demo-readiness'
import { DashboardPanel } from './DashboardPanel'

afterEach(cleanup)

function renderDashboard({
	demoReadiness,
	loading = false,
}: {
	demoReadiness: DemoReadiness | null
	loading?: boolean
}) {
	return render(
		<DashboardPanel
			birthdayAlerts={null}
			canViewEconomy
			dashboard={{}}
			demoReadiness={demoReadiness}
			tasks={[]}
			loading={loading}
			onDismissOnboardingStep={vi.fn()}
			onOpenPaymentForOrder={vi.fn()}
			onOpenSection={vi.fn()}
			onOpenSettingsSection={vi.fn()}
		/>,
	)
}

test('DashboardPanel does not render guided onboarding before the business profile hydrates', () => {
	renderDashboard({ demoReadiness: null })

	assert.equal(screen.queryByRole('heading', { name: 'Alta guiada' }), null)
})

test('DashboardPanel renders guided onboarding after the business profile hydrates', () => {
	renderDashboard({
		demoReadiness: buildDemoReadiness({ businessProfile: {} }),
	})

	assert.ok(screen.getByRole('heading', { name: 'Alta guiada' }))
})

test('DashboardPanel keeps guided onboarding visible while other data refreshes', () => {
	renderDashboard({
		demoReadiness: buildDemoReadiness({ businessProfile: {} }),
		loading: true,
	})

	assert.ok(screen.getByRole('heading', { name: 'Alta guiada' }))
})
