'use client'

import { StatusPill } from '@/app/components/ui/StatusPill'
import { Empty } from '@/app/components/ui/Empty'
import { Panel } from '@/app/components/ui/Panel'
import { type AnyRecord, formatDateTimeLabel, money } from '@/lib/page-support'

type CustomerSalesHistoryPanelProps = {
	orders: AnyRecord[]
	workOrders: AnyRecord[]
	orderLabels: Record<string, string>
	onOpenOrder: (order: AnyRecord) => void
}

export function CustomerSalesHistoryPanel({
	orders,
	workOrders,
	orderLabels,
	onOpenOrder,
}: CustomerSalesHistoryPanelProps) {
	return (
		<Panel
			title="Ventas del cliente"
			subtitle={`${orders.length} trabajos registrados`}
		>
			<div className="records compact-records">
				{orders.length ? (
					orders.map((order: AnyRecord) => {
						const detailOrder =
							workOrders.find((item) => String(item.id) === String(order.id)) ??
							order
						return (
							<button
								className="record compact"
								key={`customer-sale-${order.id}`}
								onClick={() => onOpenOrder(detailOrder)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{order.service} - {order.vehicle}
										</div>
										<div className="record-sub">
											{formatDateTimeLabel(order.received_at)} - cobrado{' '}
											{money(order.paid_amount)} - saldo{' '}
											{money(order.balance_due)} - materiales{' '}
											{money(order.material_cost)}
										</div>
									</div>
									<div className="record-actions">
										<StatusPill value={order.status} labels={orderLabels} />
										<span className="status payment">
											{money(order.total_amount)}
										</span>
									</div>
								</div>
							</button>
						)
					})
				) : (
					<Empty text="Este cliente todavia no tiene ventas." />
				)}
			</div>
		</Panel>
	)
}
