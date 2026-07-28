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

test('DashboardPanel keeps task navigation available with guided onboarding', () => {
	const onOpenSection = vi.fn()
	render(
		<DashboardPanel
			birthdayAlerts={null}
			canViewEconomy
			dashboardView="summary"
			dashboard={{}}
			demoReadiness={buildDemoReadiness({ businessProfile: {} })}
			tasks={[
				{
					id: 1,
					title: 'Confirmar entrega',
					status: 'pending',
					priority: 'high',
				},
			]}
			loading={false}
			onDismissOnboardingStep={vi.fn()}
			onOpenPaymentForOrder={vi.fn()}
			onOpenSection={onOpenSection}
			onOpenSettingsSection={vi.fn()}
		/>,
	)

	assert.ok(screen.getByRole('heading', { name: 'Alta guiada' }))
	assert.ok(screen.getByText('Confirmar entrega'))
	screen.getByRole('button', { name: 'Ver todas las tareas' }).click()
	assert.deepEqual(onOpenSection.mock.calls, [['tasks']])
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

test('overdue reservations lead Now, preview three, and preserve After actions and important tasks', () => {
	const onOpenOverdueReservations = vi.fn()
	const onOpenPaymentForOrder = vi.fn()
	const overdueReservations = [
		{ id: 1, customer_name: 'Primero', vehicle_label: 'Auto 1', deadline: '2026-07-20' },
		{ id: 2, customer_name: 'Segundo', vehicle_label: 'Auto 2', deadline: '2026-07-21' },
		{ id: 3, customer_name: 'Tercero', vehicle_label: 'Auto 3', deadline: '2026-07-22' },
		{ id: 4, customer_name: 'Cuarto', vehicle_label: 'Auto 4', deadline: '2026-07-23' },
	]

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
			tasks={[
				{
					id: 1,
					title: 'Confirmar entrega',
					status: 'pending',
					priority: 'high',
				},
			]}
			loading={false}
			onDismissOnboardingStep={vi.fn()}
			onOpenOverdueReservations={onOpenOverdueReservations}
			onOpenPaymentForOrder={onOpenPaymentForOrder}
			onOpenSection={vi.fn()}
			onOpenSettingsSection={vi.fn()}
			overdueReservations={overdueReservations}
			overdueReservationsLoadState="ready"
		/>,
	)

	screen.getByText('Mantener la agenda al dia')
	screen.getByText('4 reservas vencidas')
	screen.getByText('Primero')
	screen.getByText('Segundo')
	screen.getByText('Tercero')
	assert.equal(screen.queryByText('Cuarto'), null)
	screen.getByText('Después')
	screen.getByRole('button', { name: /Cobrar saldo mas antiguo/ })
	screen.getByText('Confirmar entrega')

	screen.getByRole('button', { name: 'Ver todas' }).click()
	assert.equal(onOpenOverdueReservations.mock.calls.length, 1)
	assert.equal(onOpenPaymentForOrder.mock.calls.length, 0)
})

test('overdue action stays disabled while Dashboard datasets are loading', () => {
	const onOpenOverdueReservations = vi.fn()
	render(
		<DashboardPanel
			birthdayAlerts={null}
			canViewEconomy
			dashboardView="summary"
			dashboard={{ work_orders_count: 1 }}
			demoReadiness={null}
			tasks={[]}
			loading
			onDismissOnboardingStep={vi.fn()}
			onOpenOverdueReservations={onOpenOverdueReservations}
			onOpenPaymentForOrder={vi.fn()}
			onOpenSection={vi.fn()}
			onOpenSettingsSection={vi.fn()}
			overdueReservations={[
				{
					id: 1,
					customer_name: 'Carga pendiente',
					deadline: '2026-07-20',
				},
			]}
			overdueReservationsLoadState="ready"
		/>,
	)

	const action = screen.getByRole('button', { name: 'Ver todas' })
	assert.equal(action.getAttribute('disabled'), '')
	action.click()
	assert.equal(onOpenOverdueReservations.mock.calls.length, 0)
})

test('ready-empty backlog communicates Agenda current only in summary view', () => {
	const { rerender } = render(
		<DashboardPanel
			birthdayAlerts={null}
			canViewEconomy
			dashboardView="summary"
			dashboard={{}}
			demoReadiness={null}
			tasks={[]}
			loading={false}
			onDismissOnboardingStep={vi.fn()}
			onOpenOverdueReservations={vi.fn()}
			onOpenPaymentForOrder={vi.fn()}
			onOpenSection={vi.fn()}
			onOpenSettingsSection={vi.fn()}
			overdueReservations={[]}
			overdueReservationsLoadState="ready"
		/>,
	)
	screen.getByRole('button', { name: 'Agenda al dia. Abrir Agenda' })

	rerender(
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
			onOpenOverdueReservations={vi.fn()}
			onOpenPaymentForOrder={vi.fn()}
			onOpenSection={vi.fn()}
			onOpenSettingsSection={vi.fn()}
			overdueReservations={[]}
			overdueReservationsLoadState="ready"
		/>,
	)
	assert.equal(
		screen.queryByRole('button', { name: 'Agenda al dia. Abrir Agenda' }),
		null,
	)
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
