import { type ReactNode } from 'react'

import { MetricCard } from '@/app/components/ui/MetricCard'
import { Panel } from '@/app/components/ui/Panel'
import { cx } from '@/app/components/utils'
import { type AnyRecord, money, numberValue } from '@/lib/page-support'

// Punto medio de cada bucket de antiguedad para estimar dias promedio de cobranza.
const AGING_MIDPOINTS: Record<string, number> = {
	'0_7': 3.5,
	'8_15': 11.5,
	'16_30': 23,
	'31_plus': 45,
}

function percent(value: number) {
	return `${Math.round(value)}%`
}

function plural(count: number, singular: string, many: string) {
	return `${count} ${count === 1 ? singular : many}`
}

// "Lecturas cruzadas": ratios que cruzan dos datos del periodo (cobranza, margen,
// posicion neta, categorias de ingreso/egreso) y dicen algo que un total solo no dice.
export function DashboardCrossReadings({ dashboard }: { dashboard: AnyRecord }) {
	const billed = numberValue(dashboard.billed_total)
	const collected = numberValue(dashboard.collected_total)
	const margin = numberValue(dashboard.estimated_margin_total)
	const balanceDue = numberValue(dashboard.balance_due_total)
	const openDebts = numberValue(dashboard.open_debts_total)
	const workOrders = numberValue(dashboard.work_orders_count)
	const averageTicket = numberValue(dashboard.average_ticket)

	const aging = Array.isArray(dashboard.receivables_aging)
		? dashboard.receivables_aging
		: []
	const agingTotal = aging.reduce(
		(sum: number, bucket: AnyRecord) => sum + numberValue(bucket.amount),
		0,
	)
	const avgCollectionDays =
		agingTotal > 0
			? aging.reduce(
					(sum: number, bucket: AnyRecord) =>
						sum +
						numberValue(bucket.amount) *
							(AGING_MIDPOINTS[String(bucket.id ?? '')] ?? 23),
					0,
				) / agingTotal
			: 0

	const cashByCategory =
		dashboard.cash_by_category && typeof dashboard.cash_by_category === 'object'
			? dashboard.cash_by_category
			: {}
	const incomeRows = Array.isArray(cashByCategory.income_by_category)
		? cashByCategory.income_by_category
		: []
	const expenseRows = Array.isArray(cashByCategory.expense_by_category)
		? cashByCategory.expense_by_category
		: []
	const incomeTotal = incomeRows.reduce(
		(sum: number, row: AnyRecord) => sum + numberValue(row.total),
		0,
	)
	const expenseTotal = expenseRows.reduce(
		(sum: number, row: AnyRecord) => sum + numberValue(row.total),
		0,
	)
	const topExpense = expenseRows[0] ?? null
	const topIncome = incomeRows[0] ?? null

	const collectionRate = billed > 0 ? (collected / billed) * 100 : 0
	const marginRate = billed > 0 ? (margin / billed) * 100 : 0
	const netPosition = balanceDue - openDebts
	const expenseLoad = incomeTotal > 0 ? (expenseTotal / incomeTotal) * 100 : 0

	const cards: Array<{
		label: string
		value: ReactNode
		hint: ReactNode
		text?: boolean
	}> = [
		{
			label: 'Cobranza del periodo',
			value: percent(collectionRate),
			hint: `${money(collected)} de ${money(billed)} facturado`,
		},
		{
			label: 'Ticket promedio',
			value: money(averageTicket),
			hint: plural(workOrders, 'trabajo', 'trabajos'),
		},
		{
			label: 'Margen sobre facturado',
			value: percent(marginRate),
			hint: 'solo materiales imputados',
		},
		{
			label: 'Dias promedio de cobranza',
			value: `~${Math.round(avgCollectionDays)} dias`,
			hint: 'antiguedad promedio del saldo',
		},
		{
			label: 'Posicion neta',
			value: (
				<span
					className={
						netPosition >= 0 ? 'dashboard-cross-pos' : 'dashboard-cross-neg'
					}
				>
					{`${netPosition >= 0 ? '+' : '-'}${money(Math.abs(netPosition))}`}
				</span>
			),
			hint: `te deben ${money(balanceDue)} · debes ${money(openDebts)}`,
		},
		{
			label: 'Mayor egreso',
			value: topExpense ? String(topExpense.category) : 'Sin egresos',
			hint: topExpense
				? `${money(topExpense.total)} · ${percent(
						(numberValue(topExpense.total) / (expenseTotal || 1)) * 100,
					)} de egresos`
				: 'Sin egresos en el periodo',
			text: true,
		},
		{
			label: 'Ingreso top categoria',
			value: topIncome ? String(topIncome.category) : 'Sin ingresos',
			hint: topIncome
				? `${money(topIncome.total)} · ${percent(
						(numberValue(topIncome.total) / (incomeTotal || 1)) * 100,
					)} de ingresos`
				: 'Sin ingresos en el periodo',
			text: true,
		},
		{
			label: 'Carga de egresos',
			value: percent(expenseLoad),
			hint: `queda ${percent(Math.max(0, 100 - expenseLoad))} de la caja`,
		},
	]

	return (
		<Panel
			title="Lecturas cruzadas"
			subtitle="Ratios que cruzan dos datos y dicen algo que un total solo no dice."
		>
			<div className="dashboard-cross-grid">
				{cards.map((card) => (
					<MetricCard
						key={card.label}
						className={cx('dashboard-cross-metric', card.text && 'metric-text')}
						label={card.label}
						value={card.value}
						hint={card.hint}
						animateValue={false}
					/>
				))}
			</div>
		</Panel>
	)
}
