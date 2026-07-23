'use client'

import { money, type AnyRecord } from '@/lib/page-support'

type AgendaMaterialUsage = {
	label: string
	extra: string
}

type AgendaWorkDebtProps = {
	workOrder: AnyRecord
	materialUsage: AgendaMaterialUsage | null
}

type AgendaWorkDebtRendererProps = {
	canViewEconomy: boolean
	materialUsageForWorkOrder: (workOrder: AnyRecord) => AgendaMaterialUsage | null
}

export function AgendaWorkDebt({
	workOrder,
	materialUsage,
}: AgendaWorkDebtProps) {
	return (
		<div className="agenda-work-debt">
			<div className="agenda-work-debt-main">
				<span>Deuda</span>
				<strong className={Number(workOrder.balance_due) > 0 ? 'debt' : ''}>
					{money(workOrder.balance_due)}
				</strong>
			</div>
			{materialUsage ? (
				<span
					className="agenda-work-materials"
					title={`${materialUsage.label}${materialUsage.extra}`}
				>
					{materialUsage.label}
					{materialUsage.extra}
				</span>
			) : null}
		</div>
	)
}

export function createAgendaWorkDebtRenderer({
	canViewEconomy,
	materialUsageForWorkOrder,
}: AgendaWorkDebtRendererProps) {
	return (workOrder: AnyRecord) => {
		if (!canViewEconomy) return null
		return (
			<AgendaWorkDebt
				workOrder={workOrder}
				materialUsage={materialUsageForWorkOrder(workOrder)}
			/>
		)
	}
}
