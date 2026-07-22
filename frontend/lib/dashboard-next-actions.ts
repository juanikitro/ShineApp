export type DashboardNextActionKey =
	| 'collectOldestBalance'
	| 'reviewOverdueDebts'
	| 'createPeriodActivity'
	| 'maintainAgenda'

type DashboardNextActionSignals = {
	hasReceivable: boolean
	overdueDebtsTotal: number
	workOrdersTotal: number
}

export function selectDashboardNextActionKeys({
	hasReceivable,
	overdueDebtsTotal,
	workOrdersTotal,
}: DashboardNextActionSignals): [DashboardNextActionKey, ...DashboardNextActionKey[]] {
	const agendaAction = workOrdersTotal > 0 ? 'maintainAgenda' : 'createPeriodActivity'

	if (hasReceivable && overdueDebtsTotal > 0) {
		return ['collectOldestBalance', 'reviewOverdueDebts', agendaAction]
	}

	if (hasReceivable) return ['collectOldestBalance', agendaAction]
	if (overdueDebtsTotal > 0) return ['reviewOverdueDebts', agendaAction]
	return [agendaAction]
}
