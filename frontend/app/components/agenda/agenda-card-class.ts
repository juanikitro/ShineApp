import { cx } from '@/app/components/utils'
import { type AgendaOperationalRow } from '@/lib/agenda'
import { reservationAgendaClassNames } from '@/lib/page-support'

function reservationAgendaCardClass(status: string) {
	return cx(
		'agenda-operational-card',
		reservationAgendaClassNames[status] ?? '',
	)
}

export function agendaCardClass(row: AgendaOperationalRow) {
	const reservationStatus = row.reservation?.status
	return cx(
		reservationAgendaCardClass(reservationStatus),
		row.workOrder ? 'agenda-operational-card--with-order' : '',
	)
}
