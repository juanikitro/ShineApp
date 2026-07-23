'use client'

import { Empty } from '@/app/components/ui/Empty'
import { Panel } from '@/app/components/ui/Panel'
import { type AnyRecord, money } from '@/lib/page-support'

type CustomerRankingPanelProps = {
	title: string
	rows: AnyRecord[]
	labelKey: string
	emptyText: string
}

export function CustomerRankingPanel({
	title,
	rows,
	labelKey,
	emptyText,
}: CustomerRankingPanelProps) {
	return (
		<Panel title={title}>
			<div className="customer-ranking-list">
				{rows.length ? (
					rows.slice(0, 6).map((item: AnyRecord, index: number) => (
						<div
							className="customer-ranking-row"
							key={`${title}-${item.id ?? item.name ?? item[labelKey]}`}
						>
							<div className="customer-ranking-main">
								<div className="customer-ranking-title">
									<span className="customer-ranking-position">
										#{index + 1}
									</span>
									<strong>{item[labelKey] || 'Sin dato'}</strong>
								</div>
								<span>
									{item.work_orders_count ?? 0}{' '}
									{item.work_orders_count === 1 ? 'trabajo' : 'trabajos'}
								</span>
							</div>
							<div className="customer-ranking-values">
								<span>
									Ventas <strong>{money(item.billed_total)}</strong>
								</span>
								<span>
									Cobrado <strong>{money(item.paid_total)}</strong>
								</span>
								<span>
									Margen <strong>{money(item.margin_total)}</strong>
								</span>
							</div>
						</div>
					))
				) : (
					<Empty text={emptyText} />
				)}
			</div>
		</Panel>
	)
}

export function renderCustomerRankingPanel(
	title: string,
	rows: AnyRecord[],
	labelKey: string,
	emptyText: string,
) {
	return (
		<CustomerRankingPanel
			title={title}
			rows={rows}
			labelKey={labelKey}
			emptyText={emptyText}
		/>
	)
}
