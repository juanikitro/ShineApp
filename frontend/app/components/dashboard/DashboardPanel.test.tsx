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
			dashboardView="summary"
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

test('DashboardPanel exposes the next decision actions after the primary one', () => {
	const onOpenSection = vi.fn()

	render(
		<DashboardPanel
			birthdayAlerts={null}
			canViewEconomy
			dashboardView="summary"
			dashboard={{
				overdue_debts_count: 1,
				overdue_debts_total: 1200,
				top_receivables: [{ work_orders: [{ id: 'work-order-1' }] }],
				work_orders_count: 2,
			}}
			demoReadiness={null}
			tasks={[]}
			loading={false}
			onDismissOnboardingStep={vi.fn()}
			onOpenPaymentForOrder={vi.fn()}
			onOpenSection={onOpenSection}
			onOpenSettingsSection={vi.fn()}
		/>,
	)

	assert.ok(screen.getByText('Ahora'))
	assert.ok(screen.getByText('Después'))

	screen.getByRole('button', { name: /Revisar deudas vencidas/ }).click()

	assert.deepEqual(onOpenSection.mock.calls, [['debts']])
})

test('DashboardPanel renders a pure analytical view without the next-action panel', () => {
	render(
		<DashboardPanel
			birthdayAlerts={null}
			canViewEconomy
			dashboardView="analysis"
			dashboard={{
				analytics: {
					previous_series: { points: [] },
					commercial_funnel: {},
					customer_recurrence: {},
					service_comparison: [],
					weekly_workload: { weeks: [] },
				},
			}}
			demoReadiness={null}
			tasks={[]}
			loading={false}
			onDismissOnboardingStep={vi.fn()}
			onOpenPaymentForOrder={vi.fn()}
			onOpenSection={vi.fn()}
			onOpenSettingsSection={vi.fn()}
		/>,
	)

	assert.equal(screen.queryByText('Ahora'), null)
	assert.equal(screen.queryByText('Después'), null)
	assert.ok(screen.getByRole('heading', { name: 'Pulso comparativo' }))
})
