export type DashboardNextActionKey =
	| 'reviewOverdueReservations'
	| 'collectOldestBalance'
	| 'reviewOverdueDebts'
	| 'createPeriodActivity'
	| 'maintainAgenda'

type DashboardNextActionSignals = {
	hasReceivable: boolean
	overdueDebtsTotal: number
	overdueReservationsCount?: number
	workOrdersTotal: number
}

export function selectDashboardNextActionKeys({
	hasReceivable,
	overdueDebtsTotal,
	overdueReservationsCount = 0,
	workOrdersTotal,
}: DashboardNextActionSignals): [DashboardNextActionKey, ...DashboardNextActionKey[]] {
	const agendaAction = workOrdersTotal > 0 ? 'maintainAgenda' : 'createPeriodActivity'
	const followUpActions: DashboardNextActionKey[] = []

	if (hasReceivable && overdueDebtsTotal > 0) {
		followUpActions.push('collectOldestBalance', 'reviewOverdueDebts')
	} else if (hasReceivable) {
		followUpActions.push('collectOldestBalance')
	} else if (overdueDebtsTotal > 0) {
		followUpActions.push('reviewOverdueDebts')
	}

	if (overdueReservationsCount > 0) {
		return ['reviewOverdueReservations', ...followUpActions]
	}
	return followUpActions.length > 0
		? [followUpActions[0], ...followUpActions.slice(1), agendaAction]
		: [agendaAction]
}
