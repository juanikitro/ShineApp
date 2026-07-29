import { type AnyRecord } from './page-support'

export type WhatsappEventSource = 'reservation' | 'workOrder' | 'quote'

export type WhatsappEventSendOptions = {
	event: string
	source: WhatsappEventSource
	sourceId: number | string
	customer: AnyRecord | null | undefined
	vehicle?: AnyRecord | null
	record: AnyRecord
	reservationId?: number | string | null
}

export const whatsappEventLabels: Record<string, string> = {
	reservation_confirmed: 'turno confirmado',
	work_ready: 'trabajo listo para entregar',
	work_delivered: 'trabajo entregado',
}

export function whatsappEventForWorkOrderStatus(
	status: unknown,
): 'work_ready' | 'work_delivered' | null {
	const value = String(status ?? '')
	if (value === 'ready') return 'work_ready'
	if (value === 'delivered') return 'work_delivered'
	return null
}
