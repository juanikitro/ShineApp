import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { DashboardAnalyticsPanel } from './DashboardAnalyticsPanel'

afterEach(cleanup)

const analyticsDashboard = {
	from: '2026-07-01',
	to: '2026-07-14',
	billed_total: 210,
	collected_total: 120,
	estimated_margin_total: 190,
	cashflow_balance: 85,
	balance_due_total: 90,
	fixed_expenses_pending_total: 30,
	fixed_expenses_pending_count: 1,
	average_ticket: 105,
	debt_timing: {
		as_of: '2026-07-14',
		due_soon_days: 7,
		overdue: { amount: 40, count: 1 },
		due_soon: { amount: 20, count: 1 },
	},
	previous_period: {
		billed_total: 80,
		estimated_margin_total: 80,
		cashflow_balance: 40,
		average_ticket: 80,
	},
	series: {
		points: [
			{ date: '2026-07-01', billed_total: 120, cashflow_balance: 40 },
			{ date: '2026-07-08', billed_total: 90, cashflow_balance: 45 },
		],
	},
	receivables_aging: [{ id: '0_7', label: '0-7 días', count: 1, amount: 90 }],
	rankings: {
		top_customers_by_billed: [
			{ customer_id: 1, customer_name: 'Cliente recurrente', billed_total: 210 },
		],
	},
	analytics: {
		previous_series: {
			points: [
				{ date: '2026-06-17', billed_total: 80, cashflow_balance: 40 },
				{ date: '2026-06-24', billed_total: 0, cashflow_balance: 0 },
			],
		},
		commercial_funnel: {
			unit: 'quote',
			total_quotes: 5,
			draft_quotes: 1,
			sent_quotes: 1,
			accepted_quotes: 2,
			rejected_quotes: 1,
			booked_quotes: 2,
			delivered_quotes: 2,
			collected_quotes: 1,
		},
		customer_recurrence: {
			customers_count: 2,
			recurring_customers_count: 1,
			new_customers_count: 1,
			repeat_rate: 50,
		},
		capacity_occupancy: {
			unit: 'reservation',
			from: '2026-07-01',
			to: '2026-07-14',
			sectors_count: 3,
			active_statuses: ['pending', 'confirmed', 'in_progress', 'ready', 'delivered'],
			sector_days: [
				{
					date: '2026-07-03',
					sector_id: 1,
					sector_name: 'Lavadero',
					used_slots: 2,
					capacity: 2,
					available_slots: 0,
					occupancy_rate: 100,
				},
				{
					date: '2026-07-04',
					sector_id: 2,
					sector_name: 'Detailing',
					used_slots: 3,
					capacity: 4,
					available_slots: 1,
					occupancy_rate: 75,
				},
				{
					date: '2026-07-05',
					sector_id: 3,
					sector_name: 'Lubricentro',
					used_slots: 1,
					capacity: 4,
					available_slots: 3,
					occupancy_rate: 25,
				},
				{
					date: '2026-07-06',
					sector_id: 4,
					sector_name: 'Taller',
					used_slots: 1,
					capacity: 0,
					available_slots: 0,
					occupancy_rate: null,
				},
			],
		},
		service_comparison: [
			{
				service_id: 1,
				service_name: 'Detailing exterior',
				current: {
					billed_total: 210,
					work_orders_count: 2,
					margin_rate: 90,
				},
				previous: { billed_total: 80, margin_rate: 100 },
				margin_rate_delta_pp: -10,
			},
		],
		weekly_workload: {
			unit: 'work_order',
			weeks: [
				{
					from: '2026-07-01',
					to: '2026-07-07',
					entered_count: 2,
					by_status: { in_progress: 1, ready: 0, delivered: 1 },
				},
			],
		},
	},
}

test('DashboardAnalyticsPanel keeps commercial and operational units explicit', () => {
	render(<DashboardAnalyticsPanel dashboard={analyticsDashboard} />)

	assert.ok(screen.getByRole('heading', { name: 'Pulso comparativo' }))
	assert.ok(screen.getByRole('heading', { name: 'Facturado vs. período anterior' }))
	assert.ok(screen.getByRole('img', { name: 'Facturación actual y período anterior por tramo' }))
	assert.ok(screen.getByRole('heading', { name: 'Composición del facturado' }))
	assert.ok(screen.getByRole('img', { name: 'Composición del facturado por servicio' }))
	assert.ok(screen.getByRole('heading', { name: 'Ticket promedio' }))
	assert.ok(screen.getByRole('heading', { name: 'Margen por servicio' }))
	assert.ok(screen.getByText('Cinta de operación'))
	assert.ok(screen.getByText(/Cada etapa cuenta una cotización, incluso si es grupal/))
	assert.ok(screen.getByText('Cobradas sin saldo'))
	assert.ok(screen.getByRole('heading', { name: 'Capacidad de agenda' }))
	assert.ok(screen.getByText('Lavadero'))
	assert.ok(screen.getByText('Sin cupos'))
	assert.ok(screen.getByText('1 cupo disponible'))
	assert.ok(screen.getByText('Sin capacidad configurada'))
	assert.ok(screen.getByText('Aceptación'))
	assert.ok(screen.getByText('Reserva'))
	assert.ok(screen.getByText('Entrega'))
	assert.ok(screen.getByText('Cobro sin saldo'))
	assert.ok(screen.getByText(/Mayor caída: Cotizaciones → Aceptadas/))
	assert.ok(screen.getByText('Nuevos'))
	assert.ok(
		screen.getByRole('img', {
			name: 'Concentración facturada de Cliente recurrente: 100%',
		}),
	)
	assert.ok(screen.getByText('Relación cobrado / facturado'))
	assert.ok(screen.getByText('57,1%'))
	assert.ok(screen.getByText('Deudas vencidas'))
	assert.ok(screen.getByText('Por vencer en 7 días'))
	assert.ok(screen.getByText(/queda .*5.* por debajo de los compromisos visibles/i))
	assert.ok(screen.getByText(/las fechas de facturación y cobro pueden ser distintas/i))
	assert.ok(screen.getAllByText('Detailing exterior').length >= 2)
	assert.ok(screen.getByRole('heading', { name: 'Evolución de trabajos' }))
	assert.ok(screen.getByRole('img', { name: 'Evolución semanal de trabajos por estado actual' }))
	assert.ok(screen.getByText(/No se muestran rentabilidad final/))
})

test('DashboardAnalyticsPanel provides a section map without hiding the analytical reading', () => {
	render(<DashboardAnalyticsPanel dashboard={analyticsDashboard} />)

	const navigation = screen.getByRole('navigation', { name: 'Recorrido de análisis' })
	assert.equal(screen.getByRole('link', { name: 'Pulso' }).getAttribute('href'), '#dashboard-analysis-pulse')
	assert.equal(screen.getByRole('link', { name: 'Comercial' }).getAttribute('href'), '#dashboard-analysis-commercial')
	assert.ok(navigation)
	assert.ok(screen.getByRole('heading', { name: 'Margen por servicio' }))
	assert.ok(screen.getByRole('heading', { name: 'Lecturas derivadas' }))
})

test('DashboardAnalyticsPanel does not render an empty workload graph as activity', () => {
	render(
		<DashboardAnalyticsPanel
			dashboard={{
				...analyticsDashboard,
				analytics: {
					...analyticsDashboard.analytics,
					weekly_workload: {
						weeks: [
							{
								from: '2026-07-01',
								to: '2026-07-07',
								entered_count: 0,
								by_status: {},
							},
						],
					},
				},
			}}
		/>,
	)

	assert.ok(screen.getByText('Sin órdenes ingresadas en este período.'))
	assert.equal(
		screen.queryByRole('img', {
			name: 'Evolución semanal de trabajos por estado actual',
		}),
		null,
	)
})

test('DashboardAnalyticsPanel shows an honest empty state when capacity has no activity', () => {
	render(
		<DashboardAnalyticsPanel
			dashboard={{
				...analyticsDashboard,
				analytics: {
					...analyticsDashboard.analytics,
					capacity_occupancy: {
						...analyticsDashboard.analytics.capacity_occupancy,
						sector_days: [],
					},
				},
			}}
		/>,
	)

	assert.ok(
		screen.getByText('Hay sectores configurados, pero no reservas operativas en este período.'),
	)
	assert.equal(screen.queryByText('Sin cupos'), null)
})

test('DashboardAnalyticsPanel does not infer funnel loss from an insufficient base', () => {
	render(
		<DashboardAnalyticsPanel
			dashboard={{
				...analyticsDashboard,
				analytics: {
					...analyticsDashboard.analytics,
					commercial_funnel: {
						...analyticsDashboard.analytics.commercial_funnel,
						total_quotes: 2,
						accepted_quotes: 1,
						booked_quotes: 1,
						delivered_quotes: 1,
						collected_quotes: 0,
					},
				},
			}}
		/>,
	)

	assert.equal(screen.queryByText(/Mayor caída:/), null)
	assert.ok(screen.getByText(/Base insuficiente para destacar una caída entre etapas/))
})

test('DashboardAnalyticsPanel keeps zero bases and missing sectors honest', () => {
	render(
		<DashboardAnalyticsPanel
			dashboard={{
				...analyticsDashboard,
				billed_total: 0,
				collected_total: 0,
				balance_due_total: 0,
				cashflow_balance: 0,
				fixed_expenses_pending_total: 0,
				fixed_expenses_pending_count: 0,
				debt_timing: {
					...analyticsDashboard.debt_timing,
					overdue: { amount: 0, count: 0 },
					due_soon: { amount: 0, count: 0 },
				},
				rankings: { top_customers_by_billed: [] },
				receivables_aging: [],
				analytics: {
					...analyticsDashboard.analytics,
					capacity_occupancy: {
						sectors_count: 0,
						sector_days: [],
					},
					commercial_funnel: {
						unit: 'quote',
						total_quotes: 0,
						draft_quotes: 0,
						sent_quotes: 0,
						accepted_quotes: 0,
						rejected_quotes: 0,
						booked_quotes: 0,
						delivered_quotes: 0,
						collected_quotes: 0,
					},
					customer_recurrence: {
						customers_count: 0,
						recurring_customers_count: 0,
						new_customers_count: 0,
						repeat_rate: 0,
					},
				},
			}}
		/>,
	)

	assert.ok(screen.getByText('No hay sectores activos con capacidad configurada.'))
	assert.ok(screen.getByText('Sin cotizaciones en este período.'))
	assert.ok(screen.getByText('Sin base comparable'))
	assert.ok(screen.getByText('Sin facturación por cliente para medir concentración.'))
	assert.ok(
		screen.getByText(
			'No hay saldos ni compromisos próximos registrados para cruzar en este período.',
		),
	)
})

test('DashboardAnalyticsPanel distinguishes covered and negative cash pressure', () => {
	const { rerender } = render(
		<DashboardAnalyticsPanel
			dashboard={{
				...analyticsDashboard,
				fixed_expenses_pending_total: 0,
			}}
		/>,
	)

	assert.ok(screen.getByText(/supera los compromisos visibles por .*25/i))

	rerender(
		<DashboardAnalyticsPanel
			dashboard={{
				...analyticsDashboard,
				cashflow_balance: -10,
			}}
		/>,
	)

	assert.ok(screen.getByText(/El flujo neto del período es negativo en .*10/i))
	assert.ok(screen.getByText(/por cobrar en trabajos del período no se toma como caja disponible/i))
})

test('DashboardAnalyticsPanel degrades safely when an older dashboard payload lacks analytics', () => {
	render(<DashboardAnalyticsPanel dashboard={{}} />)

	assert.ok(screen.getByText('No hay análisis disponible todavía.'))
})
