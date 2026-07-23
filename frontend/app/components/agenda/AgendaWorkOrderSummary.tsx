'use client'

import { Button } from '@/app/components/ui/Button'
import { StatusPill } from '@/app/components/ui/StatusPill'
import { money, type AnyRecord } from '@/lib/page-support'

type AgendaWorkOrderSummaryProps = {
	workOrder: AnyRecord
	canViewEconomy: boolean
	orderLabels: Record<string, string>
	showDetailAction?: boolean
	onOpenDetail?: (workOrder: AnyRecord) => void
}

export function AgendaWorkOrderSummary({
	workOrder,
	canViewEconomy,
	orderLabels,
	showDetailAction = false,
	onOpenDetail,
}: AgendaWorkOrderSummaryProps) {
	return (
		<div className="agenda-workorder-summary">
			<div className="agenda-workorder-summary-head">
				<strong>Trabajo de la reserva</strong>
				<div className="record-actions">
					<StatusPill value={workOrder.status} labels={orderLabels} />
					{showDetailAction ? (
						<Button
							type="button"
							variant="ghost"
							onClick={
								onOpenDetail
									? () => onOpenDetail(workOrder)
									: undefined
							}
						>
							Editar trabajo
						</Button>
					) : null}
				</div>
			</div>
			{canViewEconomy ? (
				<div className="agenda-workorder-metrics">
					<div>
						<span>Total</span>
						<strong>{money(workOrder.total_amount)}</strong>
					</div>
					<div>
						<span>Pagado</span>
						<strong>{money(workOrder.paid_amount)}</strong>
					</div>
					<div>
						<span>Deuda</span>
						<strong className="debt">
							{money(workOrder.balance_due)}
						</strong>
					</div>
					<div>
						<span>Materiales</span>
						<strong>{money(workOrder.material_cost)}</strong>
					</div>
				</div>
			) : null}
		</div>
	)
}
