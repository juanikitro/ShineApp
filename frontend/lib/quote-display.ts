type QuoteDisplayRecord = Record<string, any>

export type QuoteLaneStatus = 'draft' | 'sent'

export const quoteStatusLabels: Record<string, string> = {
	draft: 'Sin enviar',
	sent: 'Enviado',
	accepted: 'Aceptada',
	rejected: 'Rechazada',
}

export function quoteCode(item: QuoteDisplayRecord) {
	return item.public_code ?? `#${item.id}`
}

export function quoteHasReservation(item: QuoteDisplayRecord) {
	return Boolean(item.has_reservation ?? item.reservation)
}

export function firstGroupReservationLine(item: QuoteDisplayRecord) {
	return (item.vehicle_lines ?? []).find(
		(line: QuoteDisplayRecord) => line.reservation || line.reservation_id,
	)
}

export function quoteReservationId(item: QuoteDisplayRecord): string {
	if (item.is_group) {
		const line = firstGroupReservationLine(item)
		return line?.reservation === null || line?.reservation === undefined
			? String(line?.reservation_id ?? '')
			: String(line.reservation)
	}
	return item.reservation === null || item.reservation === undefined
		? ''
		: String(item.reservation)
}

export function quoteLaneStatus(item: QuoteDisplayRecord): QuoteLaneStatus {
	return String(item.status ?? 'draft') === 'draft' ? 'draft' : 'sent'
}

export function quoteBoardForQuotes(quotes: QuoteDisplayRecord[]) {
	const draft = quotes.filter((item) => quoteLaneStatus(item) === 'draft')
	const sent = quotes.filter((item) => quoteLaneStatus(item) === 'sent')
	return { draft, sent }
}

export function quoteDropStatus(value: any): 'draft' | 'sent' | null {
	if (value === null || value === undefined) return null
	const raw = String(value)
	const status = raw.startsWith('quote-lane:')
		? raw.replace('quote-lane:', '')
		: raw
	return status === 'draft' || status === 'sent' ? status : null
}
