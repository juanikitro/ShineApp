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

test('DashboardPanel exposes evidence-based tooltips for every summary metric', () => {
	renderDashboard({ demoReadiness: null })

	const tooltips = [
		'Importe de los trabajos operativos ingresados en el rango seleccionado. Suma el total de cada orden creada en ese período. Solo incluye reservas En proceso, Listas o Entregadas.',
		'Resultado estimado del período. Resta al total facturado el costo estimado de los consumos de materiales registrados en el mismo rango. No descuenta compras de reposición, gastos fijos ni otros movimientos de caja.',
		'Saldo de los movimientos de caja del rango seleccionado. Resta los egresos de los ingresos y también descuenta los pagos de deudas registrados en ese período. Excluye el movimiento original que generó una deuda para no contarlo dos veces.',
		'Saldo pendiente de los trabajos operativos creados en el rango seleccionado. Para cada orden, resta todos los pagos vinculados a su total facturado. Solo incluye reservas En proceso, Listas o Entregadas.',
		'Pagos registrados con fecha de pago dentro del rango seleccionado. Suma los importes de todos los pagos del negocio en ese período. No usa la fecha ni el estado de la orden de trabajo.',
		'Costo estimado de los materiales consumidos en el rango seleccionado. Suma los consumos registrados y los movimientos de stock de tipo Consumo. No incluye compras ni stock inicial.',
		'Valor de las compras de materiales del rango seleccionado. Suma compras registradas y movimientos de stock de tipo Compra. No incluye consumos, ventas ni stock inicial.',
		'Saldo actual de deudas vencidas. Para cada deuda con vencimiento anterior a hoy, resta los pagos al importe original. No depende del rango seleccionado e ignora las deudas ya saldadas.',
		'Importe pendiente de las ocurrencias de gastos fijos del rango seleccionado. Suma las ocurrencias con estado Pendiente según su fecha de período. Excluye las pagadas y las de otros períodos.',
	]

	for (const tooltip of tooltips) {
		assert.ok(screen.getByRole('tooltip', { name: tooltip, hidden: true }))
	}

	const billedMetric = screen
		.getAllByText('Facturado')
		.find((element) => element.closest('.dashboard-executive-metric'))
		?.closest<HTMLElement>('.metric')
	assert.ok(billedMetric)
	assert.equal(billedMetric.getAttribute('tabindex'), '0')
	assert.ok(billedMetric.getAttribute('aria-describedby'))
	billedMetric.focus()
	assert.equal(document.activeElement, billedMetric)
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

test('DashboardPanel names an empty material ranking instead of leaving its card blank', () => {
	render(
		<DashboardPanel
			birthdayAlerts={null}
			canViewEconomy
			dashboardView="summary"
			dashboard={{
				rankings: {
					top_customers_by_billed: [
						{
							customer_id: 1,
							customer_name: 'Cliente frecuente',
							billed_total: 1200,
							work_orders_count: 1,
						},
					],
					top_materials_by_cost: [],
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

	assert.ok(screen.getByRole('heading', { name: 'Rankings economicos' }))
	assert.ok(screen.getByText('Sin materiales imputados en este período.'))
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
