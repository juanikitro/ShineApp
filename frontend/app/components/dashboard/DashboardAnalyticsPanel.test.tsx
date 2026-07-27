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
	average_ticket: 105,
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
	assert.ok(screen.getByText('Cada etapa cuenta una cotización, incluso si es grupal.'))
	assert.ok(screen.getByText('Cobradas sin saldo'))
	assert.ok(screen.getAllByText('Detailing exterior').length >= 2)
	assert.ok(screen.getByRole('heading', { name: 'Evolución de trabajos' }))
	assert.ok(screen.getByRole('img', { name: 'Evolución semanal de trabajos por estado actual' }))
	assert.ok(screen.getByText(/No se muestran rentabilidad por técnico/))
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

test('DashboardAnalyticsPanel degrades safely when an older dashboard payload lacks analytics', () => {
	render(<DashboardAnalyticsPanel dashboard={{}} />)

	assert.ok(screen.getByText('No hay análisis disponible todavía.'))
})
