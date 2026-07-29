'use client'

import { CheckCircle2, CreditCard, Trash2 } from 'lucide-react'

import { type AgendaReservationAction } from '@/lib/reservation-actions'

export function AgendaQuickActionIcon({
	action,
}: {
	action: AgendaReservationAction
}) {
	if (action.kind === 'work-order-charge') return <CreditCard size={15} />
	if (
		action.kind === 'reservation' &&
		(action.action === 'cancel' || action.action === 'delete')
	) {
		return <Trash2 size={15} />
	}
	return <CheckCircle2 size={15} />
}
