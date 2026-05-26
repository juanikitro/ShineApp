import {
	type AnyRecord,
	formatDateLabel,
} from '@/lib/page-support'

export function customerDaysText(value: any, emptyText = 'Sin dato') {
	const days = Number(value)
	if (!Number.isFinite(days)) return emptyText
	if (days === 0) return 'Hoy'
	if (days === 1) return '1 dia'
	return `${days} dias`
}

export function customerDaysAgoText(value: any, emptyText = 'Sin dato') {
	const label = customerDaysText(value, emptyText)
	if (label === emptyText || label === 'Hoy') return label
	return `Hace ${label}`
}

export function customerAverageGapText(value: any) {
	const days = Number(value)
	if (!Number.isFinite(days)) return 'Sin suficiente historial'
	if (days === 0) return 'Visitas el mismo dia'
	if (days === 1) return '1 dia promedio entre visitas'
	return `${days} dias promedio entre visitas`
}

export function formatTimeLabel(value: any) {
	const raw = String(value ?? '')
	return raw.length >= 5 ? raw.slice(0, 5) : ''
}

export function customerScheduleLabel(
	reservation: AnyRecord | null | undefined,
	showReservationTimes = true,
) {
	if (!reservation?.day) return 'Sin reserva futura'
	const time =
		showReservationTimes && reservation.start_time
			? ` ${formatTimeLabel(reservation.start_time)}`
			: ''
	return `${formatDateLabel(reservation.day)}${time}`
}

export function customerListInsights(customer: AnyRecord) {
	return customer?.list_insights ?? {}
}
