import { type CSSProperties } from 'react'

import { Empty } from '@/app/components/ui/Empty'
import { Panel } from '@/app/components/ui/Panel'
import { type AnyRecord, money, numberValue } from '@/lib/page-support'

const EXPENSE_PALETTE = [
	'rgba(251, 113, 133, 0.65)',
	'rgba(251, 146, 60,  0.65)',
	'rgba(96,  165, 250, 0.65)',
	'rgba(52,  211, 153, 0.65)',
	'rgba(196, 181, 253, 0.65)',
	'rgba(251, 207, 232, 0.65)',
	'rgba(253, 224, 71,  0.65)',
	'rgba(165, 243, 252, 0.65)',
]

function CategoryList({
	rows,
	total,
	tone,
	labelKey = 'category',
}: {
	rows: AnyRecord[]
	total: number
	tone: 'income' | 'expense'
	labelKey?: string
}) {
	const max = rows.reduce(
		(highest: number, row: AnyRecord) => Math.max(highest, numberValue(row.total)),
		0,
	)
	if (rows.length === 0) {
		return <Empty text="Sin movimientos en el periodo." />
	}
	return (
		<div className="dashboard-catbreak">
			{rows.map((row: AnyRecord, index: number) => {
				const value = numberValue(row.total)
				const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
				const share = total > 0 ? Math.round((value / total) * 100) : 0
				const fill =
					tone === 'income'
						? 'var(--dashboard-bar-income)'
						: EXPENSE_PALETTE[index % EXPENSE_PALETTE.length]
				const label = String(row[labelKey] ?? '')
				return (
					<div className="dashboard-catrow" key={label || index}>
						<div className="dashboard-catrow-top">
							<span>{label}</span>
							<strong>
								{money(value)}
								<small>{share}%</small>
							</strong>
						</div>
						<span
							className="dashboard-catbar"
							style={
								{ ['--share']: `${width}%`, ['--bar-fill']: fill } as CSSProperties
							}
							aria-hidden="true"
						/>
					</div>
				)
			})}
		</div>
	)
}

// "Caja por categoria": de donde entra y en que se va la plata del periodo.
export function DashboardCashByCategory({ dashboard }: { dashboard: AnyRecord }) {
	const cashByCategory =
		dashboard.cash_by_category && typeof dashboard.cash_by_category === 'object'
			? dashboard.cash_by_category
			: {}
	const incomeRows = Array.isArray(cashByCategory.income_by_service)
		? cashByCategory.income_by_service
		: []
	const expenseRows = Array.isArray(cashByCategory.expense_by_category)
		? cashByCategory.expense_by_category
		: []
	if (incomeRows.length === 0 && expenseRows.length === 0) {
		return null
	}
	const incomeTotal = incomeRows.reduce(
		(sum: number, row: AnyRecord) => sum + numberValue(row.total),
		0,
	)
	const expenseTotal = expenseRows.reduce(
		(sum: number, row: AnyRecord) => sum + numberValue(row.total),
		0,
	)
	return (
		<Panel
			title="Caja por categoria"
			subtitle="De donde entra y en que se va la plata del periodo."
		>
			<div className="dashboard-cat-grid">
				<div className="dashboard-cat-col">
					<div className="dashboard-section-kicker">
						<span>Ingresos por servicio</span>
						<strong>{money(incomeTotal)}</strong>
					</div>
					<CategoryList rows={incomeRows} total={incomeTotal} tone="income" labelKey="service" />
				</div>
				<div className="dashboard-cat-col">
					<div className="dashboard-section-kicker">
						<span>Egresos por categoria</span>
						<strong>{money(expenseTotal)}</strong>
					</div>
					<CategoryList rows={expenseRows} total={expenseTotal} tone="expense" />
				</div>
			</div>
		</Panel>
	)
}
